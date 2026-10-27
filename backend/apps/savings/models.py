from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel

from .constants import MIN_DAILY


class SavingsPlan(TimeStampedModel):
    """A personal, locked savings plan. Not part of the group fund balance."""

    class Period(models.TextChoices):
        QUARTERLY = "quarterly", "Quarterly (3 months)"
        SEMIANNUAL = "semiannual", "Semi-annually (6 months)"
        ANNUAL = "annual", "Annually (12 months)"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        WITHDRAWING = "withdrawing", "Payout in progress"
        WITHDRAWN = "withdrawn", "Withdrawn"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="savings_plans")
    name = models.CharField(max_length=30)
    daily_amount = models.PositiveIntegerField(validators=[MinValueValidator(MIN_DAILY)])
    period = models.CharField(max_length=10, choices=Period.choices)
    months = models.PositiveSmallIntegerField()
    start_date = models.DateField(default=timezone.localdate)
    maturity_date = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    withdrawn_on = models.DateField(null=True, blank=True)
    withdrawn_amount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(daily_amount__gte=MIN_DAILY), name="savings_min_daily"),
            models.CheckConstraint(condition=models.Q(maturity_date__gt=models.F("start_date")), name="savings_matures_after_start"),
        ]

    def __str__(self):
        return f"{self.owner}: {self.name} ({self.get_period_display()})"


class SavingsDeposit(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for M-Pesa"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    plan = models.ForeignKey(SavingsPlan, on_delete=models.PROTECT, related_name="deposits")
    amount = models.PositiveIntegerField(validators=[MinValueValidator(MIN_DAILY)])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    reference = models.CharField(max_length=40, unique=True, null=True, blank=True)
    paid_on = models.DateField(default=timezone.localdate)

    class Meta:
        ordering = ["-paid_on", "-id"]
