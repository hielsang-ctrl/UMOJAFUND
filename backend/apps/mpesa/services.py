"""
Everything that changes an MpesaTransaction. Rules that keep money safe:
  * Callbacks can arrive twice, late, or out of order  -> every handler is idempotent
    (it locks the row and ignores it unless the transaction is still open).
  * A payout we are unsure about is never retried automatically -> status UNCONFIRMED, settled by a human.
"""
import logging
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.common.phone import normalise_phone

from . import client
from .client import DarajaError
from .models import MpesaTransaction as Txn
from .signals import payout_failed, payout_succeeded, stk_failed, stk_succeeded

log = logging.getLogger(__name__)

STK_RESULT_STATUS = {0: Txn.Status.SUCCESS, 1032: Txn.Status.CANCELLED, 1037: Txn.Status.TIMEOUT}


# ------------------------------------------------------------------ initiating
def initiate_stk(*, user, phone, amount, purpose, object_id, account_reference, description):
    msisdn = normalise_phone(phone)
    if not msisdn:
        raise ValueError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    txn = Txn.objects.create(
        kind=Txn.Kind.STK, purpose=purpose, object_id=object_id, user=user, phone=msisdn,
        amount=amount, account_reference=account_reference, description=description,
    )
    try:
        data = client.stk_push(phone=msisdn, amount=amount, account_reference=account_reference, description=description)
        if str(data.get("ResponseCode")) != "0":
            raise DarajaError(data.get("ResponseDescription") or "M-Pesa did not accept the request.", payload=data)
    except DarajaError as exc:
        txn.status = Txn.Status.FAILED
        txn.result_desc = str(exc)[:255]
        txn.save(update_fields=["status", "result_desc", "updated_at"])
        stk_failed.send(sender=Txn, txn=txn)
        raise
    txn.merchant_request_id = data.get("MerchantRequestID", "")
    txn.checkout_request_id = data.get("CheckoutRequestID")
    txn.save(update_fields=["merchant_request_id", "checkout_request_id", "updated_at"])
    return txn


def initiate_b2c(*, user, phone, amount, purpose, object_id, remarks):
    msisdn = normalise_phone(phone)
    if not msisdn:
        raise ValueError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    txn = Txn.objects.create(
        kind=Txn.Kind.B2C, purpose=purpose, object_id=object_id, user=user, phone=msisdn, amount=amount,
        description=remarks, originator_conversation_id=str(uuid.uuid4()),
    )
    try:
        data = client.b2c_payment(
            originator_conversation_id=txn.originator_conversation_id, phone=msisdn, amount=amount, remarks=remarks,
        )
        if str(data.get("ResponseCode")) != "0":
            raise DarajaError(data.get("ResponseDescription") or "M-Pesa did not accept the payout.", payload=data)
    except DarajaError as exc:
        if exc.definite:
            txn.status = Txn.Status.FAILED
            txn.result_desc = str(exc)[:255]
            txn.save(update_fields=["status", "result_desc", "updated_at"])
            payout_failed.send(sender=Txn, txn=txn)
        else:
            # We do not know whether the money moved. Leave it open for a human; never auto-retry.
            txn.status = Txn.Status.UNCONFIRMED
            txn.result_desc = "No clear answer from M-Pesa. Check the portal before retrying."
            txn.save(update_fields=["status", "result_desc", "updated_at"])
        raise
    txn.conversation_id = data.get("ConversationID", "")
    txn.save(update_fields=["conversation_id", "updated_at"])
    return txn


# ------------------------------------------------------------------ STK results
def _finish_stk(txn, code, desc, *, receipt, payload):
    txn.result_code = code
    txn.result_desc = (desc or "")[:255]
    txn.receipt = receipt or ""
    txn.callback_payload = payload
    txn.completed_at = timezone.now()
    txn.status = STK_RESULT_STATUS.get(code, Txn.Status.FAILED)
    txn.save()
    (stk_succeeded if code == 0 else stk_failed).send(sender=Txn, txn=txn)


@transaction.atomic
def handle_stk_callback(payload):
    cb = (payload.get("Body") or {}).get("stkCallback") or {}
    txn = Txn.objects.select_for_update().filter(kind=Txn.Kind.STK, checkout_request_id=cb.get("CheckoutRequestID")).first()
    if txn is None:
        log.error("STK callback for an unknown CheckoutRequestID: %s", payload)  # money may have arrived: investigate
        return None
    if txn.status not in Txn.OPEN_STATUSES:
        return txn  # duplicate delivery
    items = {i.get("Name"): i.get("Value") for i in (cb.get("CallbackMetadata") or {}).get("Item", [])}
    _finish_stk(txn, int(cb.get("ResultCode", -1)), cb.get("ResultDesc", ""), receipt=items.get("MpesaReceiptNumber", ""), payload=payload)
    return txn


def reconcile_pending_stk(min_age_seconds=120):
    """
    Safety net for callbacks that never arrived: asks Daraja about STK pushes still pending after a couple
    of minutes. (The query result has no receipt number, so those payments get a placeholder reference.)
    """
    cutoff = timezone.now() - timedelta(seconds=min_age_seconds)
    pending = Txn.objects.filter(
        kind=Txn.Kind.STK, status=Txn.Status.PENDING, created_at__lte=cutoff, checkout_request_id__isnull=False
    ).values_list("pk", "checkout_request_id")
    settled = 0
    for pk, checkout_id in list(pending):
        try:
            data = client.stk_query(checkout_id)
        except DarajaError as exc:
            log.info("STK %s not settled yet: %s", checkout_id, exc)
            continue
        with transaction.atomic():
            txn = Txn.objects.select_for_update().get(pk=pk)
            if txn.status not in Txn.OPEN_STATUSES:
                continue
            _finish_stk(txn, int(data.get("ResultCode", -1)), data.get("ResultDesc", ""), receipt="", payload=data)
            settled += 1
    return settled


# ------------------------------------------------------------------ B2C results
@transaction.atomic
def handle_b2c_result(payload):
    result = payload.get("Result") or {}
    txn = Txn.objects.select_for_update().filter(
        kind=Txn.Kind.B2C, originator_conversation_id=result.get("OriginatorConversationID")
    ).first()
    if txn is None:
        log.error("B2C result for an unknown OriginatorConversationID: %s", payload)
        return None
    if txn.status not in Txn.OPEN_STATUSES:
        return txn
    code = int(result.get("ResultCode", -1))
    txn.result_code = code
    txn.result_desc = (result.get("ResultDesc") or "")[:255]
    txn.conversation_id = result.get("ConversationID", txn.conversation_id)
    txn.callback_payload = payload
    txn.completed_at = timezone.now()
    if code == 0:
        txn.status = Txn.Status.SUCCESS
        txn.receipt = result.get("TransactionID", "")
    else:
        txn.status = Txn.Status.FAILED
    txn.save()
    (payout_succeeded if code == 0 else payout_failed).send(sender=Txn, txn=txn)
    return txn


@transaction.atomic
def handle_b2c_timeout(payload):
    """Safaricom's queue timed out: the result is unknown. Mark it for a human; a late result callback can still settle it."""
    result = payload.get("Result") or payload
    txn = Txn.objects.select_for_update().filter(
        kind=Txn.Kind.B2C, originator_conversation_id=result.get("OriginatorConversationID")
    ).first()
    if txn and txn.status == Txn.Status.PENDING:
        txn.status = Txn.Status.UNCONFIRMED
        txn.result_desc = "Safaricom queue timeout. Check the portal before retrying."
        txn.callback_payload = payload
        txn.save()
    return txn


@transaction.atomic
def settle_b2c_manually(txn_id, *, sent, receipt=""):
    """Used from the Django admin after someone checked the M-Pesa portal for an UNCONFIRMED payout."""
    txn = Txn.objects.select_for_update().get(pk=txn_id, kind=Txn.Kind.B2C)
    if txn.status not in Txn.OPEN_STATUSES:
        return txn
    txn.status = Txn.Status.SUCCESS if sent else Txn.Status.FAILED
    txn.receipt = receipt
    txn.result_desc = "Settled manually by an admin."
    txn.completed_at = timezone.now()
    txn.save()
    (payout_succeeded if sent else payout_failed).send(sender=Txn, txn=txn)
    return txn
