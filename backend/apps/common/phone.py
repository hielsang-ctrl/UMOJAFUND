import re

_SAFARICOM = re.compile(r"^[17]\d{8}$")


def normalise_phone(raw):
    """
    0712345678, 712345678, 254712345678, +254 712 345 678  ->  "254712345678"
    Returns None when the number is not a valid Kenyan mobile number.
    (Same rule as the frontend's mpesa.js normalisePhone.)
    """
    digits = re.sub(r"\D", "", str(raw or ""))
    if digits.startswith("254"):
        digits = digits[3:]
    elif digits.startswith("0"):
        digits = digits[1:]
    return "254" + digits if _SAFARICOM.match(digits) else None
