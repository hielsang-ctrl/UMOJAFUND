from django.apps import AppConfig


class SavingsConfig(AppConfig):
    name = "apps.savings"

    def ready(self):
        from . import receivers  # noqa: F401  (connects the M-Pesa signals)
