from django.db.models import Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.throttles import MpesaRateThrottle
from apps.mpesa.client import DarajaError

from . import services
from .models import SavingsDeposit, SavingsPlan
from .serializers import DepositCreateSerializer, PlanCreateSerializer, SavingsPlanSerializer, WithdrawSerializer


class SavingsPlanViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Personal savings: everyone only ever sees their own plans, admins included.
      POST /savings/plans/                create a plan (min KES 50 a day, quarterly / semiannual / annual)
      POST /savings/plans/<id>/deposit/   M-Pesa STK Push into the plan
      POST /savings/plans/<id>/withdraw/  pay everything out via B2C, only once the plan has matured
    """

    serializer_class = SavingsPlanSerializer

    def get_queryset(self):
        done = SavingsDeposit.objects.filter(status=SavingsDeposit.Status.COMPLETED).order_by("-paid_on", "-id")
        return SavingsPlan.objects.filter(owner=self.request.user).prefetch_related(Prefetch("deposits", queryset=done, to_attr="done"))

    def create(self, request, *args, **kwargs):
        serializer = PlanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = services.create_plan(owner=request.user, **serializer.validated_data)
        fresh = self.get_queryset().get(pk=plan.pk)
        return Response(SavingsPlanSerializer(fresh).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], throttle_classes=[MpesaRateThrottle])
    def deposit(self, request, pk=None):
        plan = self.get_object()
        serializer = DepositCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        phone = data.get("phone") or request.user.phone
        if not phone:
            raise ValidationError({"phone": "Enter the M-Pesa number to charge."})
        try:
            deposit, txn = services.start_deposit(plan_id=plan.pk, user=request.user, amount=data["amount"], phone=phone)
        except services.PlanError as exc:
            raise ValidationError({"detail": str(exc)})
        except DarajaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(
            {"deposit_id": deposit.pk, "checkout_request_id": txn.checkout_request_id, "message": "Check your phone and enter your M-Pesa PIN."},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], throttle_classes=[MpesaRateThrottle])
    def withdraw(self, request, pk=None):
        plan = self.get_object()
        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data.get("phone") or request.user.phone
        if not phone:
            raise ValidationError({"phone": "Enter the M-Pesa number to pay out to."})
        try:
            services.start_withdrawal(plan_id=plan.pk, user=request.user, phone=phone)
        except services.PlanError as exc:
            raise ValidationError({"detail": str(exc)})
        except DarajaError as exc:
            if exc.definite:
                return Response({"detail": f"The payout was not sent: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
            return Response(
                {"detail": "We could not confirm the payout yet. Do not try again: the admin will check and settle it.", "status": "unconfirmed"},
                status=status.HTTP_202_ACCEPTED,
            )
        # The money arrives asynchronously; poll GET /savings/plans/<id>/ until status == "withdrawn".
        return Response({"detail": "Payout requested. It should reach your M-Pesa shortly.", "status": "withdrawing"}, status=status.HTTP_202_ACCEPTED)
