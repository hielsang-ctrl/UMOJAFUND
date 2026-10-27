from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Expense(TimeStampedModel):
    class Category(models.TextChoices):
        MATERIALS = "Materials", "Materials"
        LABOUR = "Labour", "Labour"
        TRANSPORT = "Transport", "Transport"
        LEGAL = "Legal", "Legal"
        OTHER = "Other", "Other"

    title = models.CharField(max_length=150)
    vendor = models.CharField(max_length=150, blank=True)
    amount = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    category = models.CharField(max_length=12, choices=Category.choices, default=Category.OTHER)
    spent_on = models.DateField(default=timezone.localdate)
    # OneToOne = one proof post can back only ONE expense, and an expense has at most one proof post.
    post = models.OneToOneField("posts.Post", null=True, blank=True, on_delete=models.SET_NULL, related_name="expense")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["-spent_on", "-id"]
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name="expense_amount_positive")]

    def __str__(self):
        return f"{self.title} (KES {self.amount})"
