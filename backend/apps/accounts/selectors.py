from django.db.models import Q, Sum
from django.db.models.functions import Coalesce

from .models import User


def members():
    """Active members, each annotated with `paid` = total of their completed contributions."""
    return User.objects.filter(is_active=True).annotate(
        paid=Coalesce(Sum("payments__amount", filter=Q(payments__status="completed")), 0)
    )
