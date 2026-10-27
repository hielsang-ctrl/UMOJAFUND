"""
Thin wrapper around the Safaricom Daraja HTTP API. No database access here.

Sandbox: https://sandbox.safaricom.co.ke      Production: https://api.safaricom.co.ke
Secrets (consumer key/secret, passkey, initiator password) come from settings and are never logged.
"""
import base64
import logging

import requests
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

log = logging.getLogger(__name__)
TIMEOUT = (5, 30)  # connect, read (seconds)
TOKEN_CACHE_KEY = "mpesa:access-token"


class DarajaError(Exception):
    """
    `definite=True`  -> Safaricom rejected the request (or it never left): nothing happened, safe to retry.
    `definite=False` -> we got no clear answer (timeout, 5xx). The request MAY have been processed.
                        For money going out (B2C) that means: do not blindly retry.
    """

    def __init__(self, message, *, definite=True, payload=None):
        super().__init__(message)
        self.definite = definite
        self.payload = payload or {}


def cfg():
    return settings.MPESA


def base_url():
    return "https://api.safaricom.co.ke" if cfg()["ENV"] == "production" else "https://sandbox.safaricom.co.ke"


def callback_url(name):
    """Public https URL Safaricom will call. The secret in the path is our shared password with the callback."""
    return f"{cfg()['CALLBACK_BASE_URL']}/api/mpesa/callback/{cfg()['CALLBACK_SECRET']}/{name}/"


def get_access_token():
    token = cache.get(TOKEN_CACHE_KEY)
    if token:
        return token
    try:
        resp = requests.get(
            f"{base_url()}/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            auth=(cfg()["CONSUMER_KEY"], cfg()["CONSUMER_SECRET"]),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise DarajaError("Could not reach M-Pesa to sign in.") from exc  # nothing was sent yet, so definite
    if resp.status_code != 200:
        raise DarajaError(f"M-Pesa sign-in failed (HTTP {resp.status_code}). Check the consumer key and secret.")
    data = resp.json()
    token = data["access_token"]
    cache.set(TOKEN_CACHE_KEY, token, max(60, int(data.get("expires_in", 3599)) - 120))
    return token


def _post(path, payload):
    headers = {"Authorization": f"Bearer {get_access_token()}", "Content-Type": "application/json"}
    try:
        resp = requests.post(f"{base_url()}{path}", json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as exc:
        raise DarajaError("No response from M-Pesa.", definite=False) from exc
    try:
        data = resp.json()
    except ValueError:
        data = {}
    if resp.status_code == 401:
        cache.delete(TOKEN_CACHE_KEY)
    if not resp.ok or "errorCode" in data:
        message = data.get("errorMessage") or f"M-Pesa error (HTTP {resp.status_code})."
        log.warning("Daraja %s failed: %s %s", path, resp.status_code, data)
        raise DarajaError(message, definite=resp.status_code < 500, payload=data)
    return data


# --------------------------------------------------------------------------- STK Push (money in)
def _stk_password(timestamp):
    raw = f"{cfg()['SHORTCODE']}{cfg()['PASSKEY']}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def stk_push(*, phone, amount, account_reference, description):
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    payload = {
        "BusinessShortCode": cfg()["SHORTCODE"],
        "Password": _stk_password(timestamp),
        "Timestamp": timestamp,
        "TransactionType": cfg()["TRANSACTION_TYPE"],
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": cfg()["PARTY_B"],
        "PhoneNumber": phone,
        "CallBackURL": callback_url("stk"),
        "AccountReference": account_reference[:12],
        "TransactionDesc": description[:13],
    }
    return _post("/mpesa/stkpush/v1/processrequest", payload)


def stk_query(checkout_request_id):
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    payload = {
        "BusinessShortCode": cfg()["SHORTCODE"],
        "Password": _stk_password(timestamp),
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }
    return _post("/mpesa/stkpushquery/v1/query", payload)


# --------------------------------------------------------------------------- B2C (money out)
def security_credential():
    """
    The value Safaricom wants in `SecurityCredential`: the initiator password encrypted with Safaricom's
    public certificate (RSA, PKCS#1 v1.5), base64 encoded.
    Two ways to provide it:
      * MPESA_SECURITY_CREDENTIAL in .env: a ready-made string (e.g. the one the Daraja portal shows for
        the sandbox test credentials). It is used as given.
      * MPESA_CERT_PATH + MPESA_INITIATOR_PASSWORD: we encrypt it ourselves (recommended for production).
    """
    ready_made = cfg().get("SECURITY_CREDENTIAL")
    if ready_made:
        return ready_made

    password = cfg()["INITIATOR_PASSWORD"]
    path = cfg()["CERT_PATH"]
    if not password:
        raise DarajaError("Payouts are not configured: MPESA_INITIATOR_PASSWORD is empty.")
    try:
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError as exc:
        raise DarajaError(f"Payouts are not configured: certificate file not found at {path}.") from exc
    try:
        try:
            cert = x509.load_pem_x509_certificate(data)
        except ValueError:
            cert = x509.load_der_x509_certificate(data)
    except ValueError as exc:
        raise DarajaError(
            "Payouts are not configured: the file at MPESA_CERT_PATH is not a certificate "
            "(it should start with -----BEGIN CERTIFICATE-----). Download Safaricom's certificate again."
        ) from exc
    # Nothing was sent to Safaricom, so every failure above is "definite" and the payout is safely undone.
    encrypted = cert.public_key().encrypt(password.encode(), padding.PKCS1v15())
    return base64.b64encode(encrypted).decode()


def b2c_payment(*, originator_conversation_id, phone, amount, remarks, occasion=""):
    """B2C v3. `originator_conversation_id` is OUR unique id for this payout: Safaricom uses it to refuse duplicates."""
    payload = {
        "OriginatorConversationID": originator_conversation_id,
        "InitiatorName": cfg()["INITIATOR_NAME"],
        "SecurityCredential": security_credential(),
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": cfg()["B2C_SHORTCODE"],
        "PartyB": phone,
        "Remarks": remarks[:100],
        "QueueTimeOutURL": callback_url("b2c/timeout"),
        "ResultURL": callback_url("b2c/result"),
        "Occasion": occasion[:100],
    }
    return _post("/mpesa/b2c/v3/paymentrequest", payload)
