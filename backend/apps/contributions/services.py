import secrets

from apps.mpesa import services as mpesa
from apps.mpesa.models import MpesaTransaction

from .models import Payment


def record_cash_payment(*, member, amount, admin, reference=""):
    reference = (reference or "").strip() or "CASH-" + secrets.token_hex(3).upper()
    return Payment.objects.create(
        member=member, amount=amount, method=Payment.Method.CASH, status=Payment.Status.COMPLETED,
        reference=reference, recorded_by=admin,
    )


def start_mpesa_payment(*, member, amount, phone, requested_by):
    """
    Creates a PENDING payment, then pops the STK Push PIN prompt on the member's phone.
    The payment becomes COMPLETED only when Safaricom's callback says so (see receivers.py).
    Raises mpesa.client.DarajaError if Safaricom refuses; the payment is then marked FAILED.
    """
    payment = Payment.objects.create(
        member=member, amount=amount, method=Payment.Method.MPESA, status=Payment.Status.PENDING, recorded_by=requested_by,
    )
    txn = mpesa.initiate_stk(
        user=requested_by, phone=phone, amount=amount, purpose=MpesaTransaction.Purpose.CONTRIBUTION,
        object_id=payment.pk, account_reference=f"UMOJA-{member.pk}", description="Contribution",
    )
    return payment, txn
