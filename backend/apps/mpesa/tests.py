from datetime import date

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.contributions.models import Payment
from apps.mpesa.models import MpesaTransaction as Txn
from apps.savings.models import SavingsDeposit, SavingsPlan

SECRET = "test-secret"
TEST_MPESA = {**settings.MPESA, "CALLBACK_SECRET": SECRET, "CALLBACK_ALLOWED_IPS": []}


def stk_body(code=0, receipt="ABC123XYZ"):
    callback = {"MerchantRequestID": "m1", "CheckoutRequestID": "ws_CO_1", "ResultCode": code, "ResultDesc": "desc"}
    if code == 0:
        callback["CallbackMetadata"] = {"Item": [
            {"Name": "Amount", "Value": 500.0},
            {"Name": "MpesaReceiptNumber", "Value": receipt},
            {"Name": "PhoneNumber", "Value": 254712345678},
        ]}
    return {"Body": {"stkCallback": callback}}


@override_settings(MPESA=TEST_MPESA)
class StkCallbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("a@example.com", "pw-12345-pw", full_name="Amina", phone="254712345678")
        self.payment = Payment.objects.create(member=self.user, amount=500, method="mpesa", status="pending")
        self.txn = Txn.objects.create(
            kind="stk", purpose="contribution", object_id=self.payment.pk, user=self.user,
            phone="254712345678", amount=500, checkout_request_id="ws_CO_1",
        )
        self.url = f"/api/mpesa/callback/{SECRET}/stk/"

    def test_success_completes_the_payment(self):
        resp = self.client.post(self.url, stk_body(), format="json")
        self.assertEqual(resp.json()["ResultCode"], 0)
        self.payment.refresh_from_db()
        self.assertEqual((self.payment.status, self.payment.reference), ("completed", "ABC123XYZ"))

    def test_duplicate_callback_changes_nothing(self):
        self.client.post(self.url, stk_body(), format="json")
        self.client.post(self.url, stk_body(receipt="DIFFERENT"), format="json")
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.reference, "ABC123XYZ")

    def test_customer_cancelled(self):
        self.client.post(self.url, stk_body(code=1032), format="json")
        self.payment.refresh_from_db()
        self.txn.refresh_from_db()
        self.assertEqual((self.payment.status, self.txn.status), ("failed", "cancelled"))

    def test_wrong_secret_is_a_404(self):
        self.assertEqual(self.client.post("/api/mpesa/callback/nope/stk/", stk_body(), format="json").status_code, 404)

    def test_savings_deposit_is_confirmed_by_callback(self):
        plan = SavingsPlan.objects.create(
            owner=self.user, name="p", daily_amount=100, period="quarterly", months=3,
            start_date=date(2026, 1, 1), maturity_date=date(2026, 4, 1),
        )
        deposit = SavingsDeposit.objects.create(plan=plan, amount=500)
        Txn.objects.filter(pk=self.txn.pk).update(purpose="savings_deposit", object_id=deposit.pk)
        self.client.post(self.url, stk_body(), format="json")
        deposit.refresh_from_db()
        self.assertEqual(deposit.status, "completed")


@override_settings(MPESA=TEST_MPESA)
class B2CResultTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("b@example.com", "pw-12345-pw", full_name="Brian")
        self.plan = SavingsPlan.objects.create(
            owner=self.user, name="p", daily_amount=100, period="quarterly", months=3, status="withdrawing",
            withdrawn_amount=300, start_date=date(2026, 1, 1), maturity_date=date(2026, 4, 1),
        )
        SavingsDeposit.objects.create(plan=self.plan, amount=300, status="completed", reference="R1")
        Txn.objects.create(
            kind="b2c", purpose="savings_payout", object_id=self.plan.pk, user=self.user, phone="254712345678",
            amount=300, originator_conversation_id="orig-1",
        )
        self.url = f"/api/mpesa/callback/{SECRET}/b2c/result/"

    def body(self, code):
        return {"Result": {"ResultCode": code, "ResultDesc": "x", "OriginatorConversationID": "orig-1", "ConversationID": "c1", "TransactionID": "TX1"}}

    def test_success_marks_plan_withdrawn(self):
        self.client.post(self.url, self.body(0), format="json")
        self.plan.refresh_from_db()
        self.assertEqual((self.plan.status, self.plan.withdrawn_amount), ("withdrawn", 300))

    def test_failure_unlocks_plan_for_another_try(self):
        self.client.post(self.url, self.body(2001), format="json")
        self.plan.refresh_from_db()
        self.assertEqual((self.plan.status, self.plan.withdrawn_amount), ("active", 0))
