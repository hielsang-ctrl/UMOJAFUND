from django.test import SimpleTestCase

from apps.common.phone import normalise_phone


class PhoneTests(SimpleTestCase):
    def test_accepts_common_formats(self):
        for raw in ["0712345678", "712345678", "254712345678", "+254 712 345 678", "0112345678"]:
            self.assertTrue(normalise_phone(raw).startswith("254"), raw)
        self.assertEqual(normalise_phone("0712 345 678"), "254712345678")

    def test_rejects_garbage(self):
        for raw in ["", None, "12345", "0912345678", "25471234567"]:
            self.assertIsNone(normalise_phone(raw), raw)
