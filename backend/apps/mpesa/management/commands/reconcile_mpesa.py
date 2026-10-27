from django.core.management.base import BaseCommand

from apps.mpesa import services


class Command(BaseCommand):
    help = "Ask Daraja about STK pushes whose callback never arrived. Run it every few minutes (cron / Celery beat)."

    def add_arguments(self, parser):
        parser.add_argument("--min-age", type=int, default=120, help="only check pushes older than this many seconds")

    def handle(self, *args, **options):
        settled = services.reconcile_pending_stk(options["min_age"])
        self.stdout.write(self.style.SUCCESS(f"Settled {settled} pending M-Pesa payment(s)."))
