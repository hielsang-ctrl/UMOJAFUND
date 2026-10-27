from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsFundAdmin
from apps.fund.services import fund_totals, lock_fund

from .models import Expense
from .serializers import ExpenseCreateSerializer, ExpenseSerializer, LinkProofSerializer


class ExpenseViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Open ledger: every member can read it. Only the admin can add an expense, and it can never exceed the
    available balance. Expenses are not edited or deleted (it is a ledger); attach proof instead.
    """

    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_permissions(self):
        return [IsAuthenticated()] if self.action in ("list", "retrieve") else [IsFundAdmin()]

    def create(self, request, *args, **kwargs):
        serializer = ExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]
        with transaction.atomic():
            lock_fund()  # two admins clicking at once must not both pass the balance check
            balance = fund_totals()["balance"]
            if amount > balance:
                raise ValidationError({"amount": f"That is more than the available balance (KES {balance:,})."})
            expense = serializer.save(created_by=request.user)
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="proof")
    def link_proof(self, request, pk=None):
        """PATCH /expenses/<id>/proof/ {"post": <proof post id>}"""
        expense = self.get_object()
        serializer = LinkProofSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.validated_data["post"]
        if Expense.objects.filter(post=post).exclude(pk=expense.pk).exists():
            raise ValidationError({"post": "That proof post already backs another expense."})
        expense.post = post
        expense.save(update_fields=["post", "updated_at"])
        return Response(ExpenseSerializer(expense).data)
