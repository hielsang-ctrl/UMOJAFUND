from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class MpesaTransaction(TimeStampedModel):
    """One row per request we send to Daraja, updated when Safaricom calls us back."""

    class Kind(models.TextChoices):
        STK = "stk", "STK Push (money in)"
        B2C = "b2c", "B2C (money out)"

    class Purpose(models.TextChoices):
        CONTRIBUTION = "contribution", "Group contribution"
        SAVINGS_DEPOSIT = "savings_deposit", "Savings deposit"
        SAVINGS_PAYOUT = "savings_payout", "Savings payout"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled by customer"
        TIMEOUT = "timeout", "Customer did not respond"
        UNCONFIRMED = "unconfirmed", "Unconfirmed (check with Safaricom)"

    OPEN_STATUSES = (Status.PENDING, Status.UNCONFIRMED)

    kind = models.CharField(max_length=3, choices=Kind.choices)
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    object_id = models.PositiveBigIntegerField(help_text="Payment / SavingsDeposit / SavingsPlan this belongs to")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="mpesa_transactions")

    phone = models.CharField(max_length=12)
    amount = models.PositiveIntegerField()
    account_reference = models.CharField(max_length=40, blank=True)
    description = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)

    # Daraja identifiers
    merchant_request_id = models.CharField(max_length=60, blank=True)
    checkout_request_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    originator_conversation_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    conversation_id = models.CharField(max_length=80, blank=True)

    receipt = models.CharField(max_length=30, blank=True)
    result_code = models.IntegerField(null=True, blank=True)
    result_desc = models.CharField(max_length=255, blank=True)
    callback_payload = models.JSONField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["kind", "status", "created_at"])]

    def __str__(self):
        return f"{self.get_kind_display()} {self.amount} {self.phone} [{self.status}]"
