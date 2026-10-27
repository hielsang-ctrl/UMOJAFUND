from django.db import transaction
from django.dispatch import receiver
from django.utils import timezone

from apps.mpesa.models import MpesaTransaction
from apps.mpesa.signals import stk_failed, stk_succeeded

from .models import Payment

CONTRIBUTION = MpesaTransaction.Purpose.CONTRIBUTION


@receiver(stk_succeeded)
def contribution_paid(sender, txn, **kwargs):
    if txn.purpose != CONTRIBUTION:
        return
    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(pk=txn.object_id).first()
        if payment is None or payment.status == Payment.Status.COMPLETED:
            return
        payment.status = Payment.Status.COMPLETED
        payment.reference = txn.receipt or f"MPESA-{(txn.checkout_request_id or '')[-8:]}"
        payment.paid_on = timezone.localdate()
        payment.save()


@receiver(stk_failed)
def contribution_failed(sender, txn, **kwargs):
    if txn.purpose != CONTRIBUTION:
        return
    Payment.objects.filter(pk=txn.object_id, status=Payment.Status.PENDING).update(status=Payment.Status.FAILED)
