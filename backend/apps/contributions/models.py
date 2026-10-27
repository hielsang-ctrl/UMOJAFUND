from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Payment(TimeStampedModel):
    """A contribution to the group fund. A member's `paid` total is the sum of their COMPLETED payments."""

    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        MPESA = "mpesa", "M-Pesa"

    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for M-Pesa"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments")
    amount = models.PositiveIntegerField(validators=[MinValueValidator(1)], help_text="KES, whole shillings")
    method = models.CharField(max_length=5, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    reference = models.CharField(max_length=40, unique=True, null=True, blank=True, help_text="M-Pesa receipt or CASH-xxxxxx")
    paid_on = models.DateField(default=timezone.localdate)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="recorded_payments"
    )

    class Meta:
        ordering = ["-paid_on", "-id"]
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name="payment_amount_positive")]

    def __str__(self):
        return f"{self.member} paid KES {self.amount} ({self.get_method_display()}, {self.status})"
