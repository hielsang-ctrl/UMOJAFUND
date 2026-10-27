"""
The M-Pesa app only talks to Safaricom. It tells the rest of the project what happened
through these signals, so it never has to import contributions or savings.
Each signal carries `txn` (the MpesaTransaction).
"""
from django.dispatch import Signal

stk_succeeded = Signal()      # customer paid us
stk_failed = Signal()         # cancelled, timed out, wrong PIN, insufficient funds...
payout_succeeded = Signal()   # B2C money reached the member
payout_failed = Signal()      # B2C was rejected, nothing was sent
