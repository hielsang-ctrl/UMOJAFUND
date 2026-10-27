from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Message(TimeStampedModel):
    class Audience(models.TextChoices):
        PENDING = "pending", "All members who have not paid in full"
        ALL = "all", "Every member"
        ADMIN = "admin", "The admin"
        MEMBER = "member", "One member"

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    audience = models.CharField(max_length=8, choices=Audience.choices)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    to_label = models.CharField(max_length=120)
    body = models.CharField(max_length=320)
    recipient_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-id"]
