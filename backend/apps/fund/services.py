from django.conf import settings
from django.db import connection
from django.db.models import Sum

FUND_LOCK_KEY = 74_201_001


def lock_fund():
    """
    Serialises everything that spends money. Call inside transaction.atomic();
    the Postgres advisory lock is released automatically at commit/rollback.
    Without it two simultaneous expenses could both pass the balance check.
    """
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [FUND_LOCK_KEY])


def fund_totals():
    from apps.accounts.models import User
    from apps.contributions.models import Payment
    from apps.expenses.models import Expense

    collected = Payment.objects.filter(status=Payment.Status.COMPLETED).aggregate(t=Sum("amount"))["t"] or 0
    spent = Expense.objects.aggregate(t=Sum("amount"))["t"] or 0
    members = User.objects.filter(is_active=True).count()
    expected = members * settings.TARGET_PER_MEMBER
    return {
        "members": members,
        "target_per_member": settings.TARGET_PER_MEMBER,
        "collected": collected,
        "spent": spent,
        "expected": expected,
        "balance": collected - spent,
        "percent": round(collected / expected * 100, 1) if expected else 0,  # 0, never a division error
    }
