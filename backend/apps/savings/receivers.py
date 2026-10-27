from django.db import transaction
from django.dispatch import receiver
from django.utils import timezone

from apps.mpesa.models import MpesaTransaction
from apps.mpesa.signals import payout_failed, payout_succeeded, stk_failed, stk_succeeded

from .models import SavingsDeposit, SavingsPlan

DEPOSIT = MpesaTransaction.Purpose.SAVINGS_DEPOSIT
PAYOUT = MpesaTransaction.Purpose.SAVINGS_PAYOUT


@receiver(stk_succeeded)
def deposit_confirmed(sender, txn, **kwargs):
    if txn.purpose != DEPOSIT:
        return
    with transaction.atomic():
        deposit = SavingsDeposit.objects.select_for_update().filter(pk=txn.object_id).first()
        if deposit is None or deposit.status == SavingsDeposit.Status.COMPLETED:
            return
        deposit.status = SavingsDeposit.Status.COMPLETED
        deposit.reference = txn.receipt or f"MPESA-{(txn.checkout_request_id or '')[-8:]}"
        deposit.paid_on = timezone.localdate()
        deposit.save()


@receiver(stk_failed)
def deposit_failed(sender, txn, **kwargs):
    if txn.purpose == DEPOSIT:
        SavingsDeposit.objects.filter(pk=txn.object_id, status=SavingsDeposit.Status.PENDING).update(
            status=SavingsDeposit.Status.FAILED
        )


@receiver(payout_succeeded)
def payout_done(sender, txn, **kwargs):
    if txn.purpose != PAYOUT:
        return
    with transaction.atomic():
        plan = SavingsPlan.objects.select_for_update().filter(pk=txn.object_id).first()
        if plan and plan.status == SavingsPlan.Status.WITHDRAWING:
            plan.status = SavingsPlan.Status.WITHDRAWN
            plan.withdrawn_on = timezone.localdate()
            plan.withdrawn_amount = txn.amount
            plan.save()


@receiver(payout_failed)
def payout_rejected(sender, txn, **kwargs):
    if txn.purpose != PAYOUT:
        return
    with transaction.atomic():
        plan = SavingsPlan.objects.select_for_update().filter(pk=txn.object_id).first()
        if plan and plan.status == SavingsPlan.Status.WITHDRAWING:
            plan.status = SavingsPlan.Status.ACTIVE  # nothing was sent: the member can withdraw again
            plan.withdrawn_amount = 0
            plan.save()
