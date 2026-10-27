import logging

from django.conf import settings
from django.core.mail import send_mass_mail

log = logging.getLogger(__name__)


def send_sms(phone, text):
    """
    Plug your SMS provider in here (Africa's Talking, Twilio, Safaricom...). Until then it only logs.
    """
    log.info("SMS to %s: %s", phone, text)


def notify(recipients, body, sender):
    """
    Email (and SMS) every recipient. It runs inside the request for simplicity:
    for a bigger group move it to a background worker (Celery / django-q).
    """
    subject = f"{settings.GROUP_NAME}: message from {sender.full_name}"
    mails = [(subject, body, settings.DEFAULT_FROM_EMAIL, [u.email]) for u in recipients if u.email]
    if mails:
        send_mass_mail(mails, fail_silently=True)
    for user in recipients:
        if user.phone:
            send_sms(user.phone, body)
