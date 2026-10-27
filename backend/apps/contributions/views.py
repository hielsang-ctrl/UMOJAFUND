from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsFundAdmin
from apps.common.throttles import MpesaRateThrottle
from apps.mpesa.client import DarajaError

from . import services
from .models import Payment
from .serializers import CashPaymentSerializer, MpesaPaymentSerializer, PaymentSerializer


class PaymentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    GET  /payments/            the open ledger (members see completed payments; the admin also sees pending/failed)
    POST /payments/            admin records a CASH payment
    POST /payments/mpesa/      start an M-Pesa STK Push (admin for anyone, a member for themselves)
    """

    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsFundAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Payment.objects.select_related("member")
        if not self.request.user.is_fund_admin:
            qs = qs.filter(status=Payment.Status.COMPLETED)
        params = self.request.query_params
        for key in ("member", "method", "status"):
            if params.get(key):
                qs = qs.filter(**{key if key != "member" else "member_id": params[key]})
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CashPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment = services.record_cash_payment(
            member=data["member"], amount=data["amount"], admin=request.user, reference=data.get("reference", ""),
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="mpesa", throttle_classes=[MpesaRateThrottle])
    def mpesa(self, request):
        serializer = MpesaPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        member = data.get("member") or request.user
        if not request.user.is_fund_admin and member.pk != request.user.pk:
            raise PermissionDenied("You can only pay for yourself.")
        phone = data.get("phone") or member.phone
        if not phone:
            raise ValidationError({"phone": "Enter the M-Pesa number to charge."})
        try:
            payment, txn = services.start_mpesa_payment(
                member=member, amount=data["amount"], phone=phone, requested_by=request.user,
            )
        except ValueError as exc:
            raise ValidationError({"phone": str(exc)})
        except DarajaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(
            {
                "payment_id": payment.pk,
                "checkout_request_id": txn.checkout_request_id,
                "message": "Check your phone and enter your M-Pesa PIN.",
            },
            status=status.HTTP_202_ACCEPTED,
        )
