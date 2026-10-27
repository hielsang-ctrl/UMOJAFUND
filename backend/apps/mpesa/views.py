import hmac
import logging

from django.conf import settings
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import MpesaTransaction

log = logging.getLogger(__name__)
ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}


def _check_source(request, secret):
    """
    Safaricom does not sign callbacks, so we protect the endpoints ourselves:
    1. the URL contains a secret only Safaricom was given, 2. optionally only listed IPs may call.
    Anything else gets a plain 404.
    """
    expected = settings.MPESA["CALLBACK_SECRET"]
    if not expected or not hmac.compare_digest(secret, expected):
        raise Http404
    allowed = settings.MPESA["CALLBACK_ALLOWED_IPS"]
    if allowed:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
        if (forwarded or request.META.get("REMOTE_ADDR")) not in allowed:
            raise Http404


class _CallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def process(self, payload):  # pragma: no cover
        raise NotImplementedError

    def post(self, request, secret):
        _check_source(request, secret)
        try:
            self.process(request.data)
        except Exception:  # never let Safaricom see an error; keep the payload so nothing is lost
            log.exception("M-Pesa callback failed. Payload: %s", request.data)
        return Response(ACK)


class StkCallbackView(_CallbackView):
    def process(self, payload):
        services.handle_stk_callback(payload)


class B2CResultView(_CallbackView):
    def process(self, payload):
        services.handle_b2c_result(payload)


class B2CTimeoutView(_CallbackView):
    def process(self, payload):
        services.handle_b2c_timeout(payload)


class TransactionStatusView(APIView):
    """GET /api/mpesa/status/<CheckoutRequestID>/ - the frontend polls this while the PIN prompt is open."""

    def get(self, request, checkout_request_id):
        txn = get_object_or_404(MpesaTransaction, checkout_request_id=checkout_request_id)
        if not (request.user.is_fund_admin or txn.user_id == request.user.pk):
            raise Http404
        return Response({
            "status": txn.status,
            "done": txn.status not in MpesaTransaction.OPEN_STATUSES,
            "receipt": txn.receipt,
            "amount": txn.amount,
            "message": txn.result_desc,
        })
