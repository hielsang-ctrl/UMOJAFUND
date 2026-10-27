from rest_framework.throttling import UserRateThrottle


class MpesaRateThrottle(UserRateThrottle):
    """Every call that pops an M-Pesa PIN prompt is limited per user (rate: REST_FRAMEWORK > "mpesa")."""

    scope = "mpesa"
