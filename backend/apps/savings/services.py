import calendar
from datetime import date

from django.db import transaction
from django.utils import timezone

from apps.common.phone import normalise_phone
from apps.mpesa import services as mpesa
from apps.mpesa.models import MpesaTransaction

from .constants import PERIOD_MONTHS
from .models import SavingsDeposit, SavingsPlan


class PlanError(Exception):
    """A rule of the savings plan was broken (shown to the member as a 400)."""


def add_months(d, n):
    """31 Aug + 6 months = 28/29 Feb, never an overflow into March."""
    index = d.month - 1 + n
    year, month = d.year + index // 12, index % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def plan_stats(plan, completed_deposits, today=None):
    """
    Everything the Savings screen shows, worked out from a plan and its COMPLETED deposits.
    Pure function (no database access) so it is easy to test. Mirrors the frontend's planStats().
    """
    today = today or timezone.localdate()
    deposits = list(completed_deposits)
    total_days = (plan.maturity_date - plan.start_date).days
    target = plan.daily_amount * total_days
    saved = sum(d.amount for d in deposits)
    matured = today >= plan.maturity_date

    elapsed = min(total_days, max(0, (today - plan.start_date).days + 1))  # days started so far, today included
    expected = plan.daily_amount * elapsed
    behind = max(0, expected - saved)
    before = plan.daily_amount * max(0, elapsed - 1)
    if matured:
        pace = "matured"
    elif saved >= expected:
        pace = "ontrack"
    elif saved >= before:
        pace = "due"      # only today's saving is still outstanding
    else:
        pace = "behind"   # older days are missing too

    active = plan.status == SavingsPlan.Status.ACTIVE
    return {
        "total_days": total_days,
        "target": target,
        "saved": saved,
        "percent": round(min(100, saved / target * 100), 1) if target else 0,
        "elapsed": elapsed,
        "expected": expected,
        "behind": behind,
        "saved_today": sum(d.amount for d in deposits if d.paid_on == today),
        "pace": pace,
        "matured": matured,
        "days_left": max(0, (plan.maturity_date - today).days),
        "days_saved": len({d.paid_on for d in deposits}),
        "can_deposit": active and not matured,
        "can_withdraw": active and matured and saved > 0,
    }


def _completed(plan):
    return plan.deposits.filter(status=SavingsDeposit.Status.COMPLETED)


def create_plan(*, owner, name, daily_amount, period):
    months = PERIOD_MONTHS[period]
    start = timezone.localdate()
    return SavingsPlan.objects.create(
        owner=owner, name=(name or "").strip() or "My savings", daily_amount=daily_amount, period=period,
        months=months, start_date=start, maturity_date=add_months(start, months),
    )


def start_deposit(*, plan_id, user, amount, phone):
    """Creates a PENDING deposit and pops the STK Push prompt. It counts only once Safaricom confirms."""
    if not normalise_phone(phone):
        raise PlanError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    with transaction.atomic():
        plan = SavingsPlan.objects.select_for_update().get(pk=plan_id, owner=user)
        if not plan_stats(plan, _completed(plan))["can_deposit"]:
            raise PlanError("This plan is not accepting deposits.")
        deposit = SavingsDeposit.objects.create(plan=plan, amount=amount)
    txn = mpesa.initiate_stk(
        user=user, phone=phone, amount=amount, purpose=MpesaTransaction.Purpose.SAVINGS_DEPOSIT,
        object_id=deposit.pk, account_reference=f"SAVE-{plan.pk}", description="Savings",
    )
    return deposit, txn


def start_withdrawal(*, plan_id, user, phone):
    """
    Locks the plan (status WITHDRAWING) and asks M-Pesa to pay everything saved out via B2C.
    The amount is worked out here on the server, never taken from the request.
      * Safaricom confirms   -> plan becomes WITHDRAWN (receivers.py)
      * Safaricom rejects    -> plan goes back to ACTIVE so the member can try again
      * we get no clear answer -> plan stays WITHDRAWING until an admin settles it (never paid twice)
    """
    if not normalise_phone(phone):
        raise PlanError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    with transaction.atomic():
        plan = SavingsPlan.objects.select_for_update().get(pk=plan_id, owner=user)
        if plan.status != SavingsPlan.Status.ACTIVE:
            raise PlanError("A payout for this plan is already in progress or finished.")
        stats = plan_stats(plan, _completed(plan))
        if not stats["matured"]:
            raise PlanError(f"This plan is locked until {plan.maturity_date:%d %b %Y}.")
        if stats["saved"] <= 0:
            raise PlanError("There is nothing to withdraw.")
        plan.status = SavingsPlan.Status.WITHDRAWING
        plan.withdrawn_amount = stats["saved"]
        plan.save(update_fields=["status", "withdrawn_amount", "updated_at"])
        amount = stats["saved"]
    txn = mpesa.initiate_b2c(
        user=user, phone=phone, amount=amount, purpose=MpesaTransaction.Purpose.SAVINGS_PAYOUT,
        object_id=plan.pk, remarks=f"Savings payout {plan.name}",
    )
    return plan, txn
