from django.apps import AppConfig


class ContributionsConfig(AppConfig):
    name = "apps.contributions"

    def ready(self):
        from . import receivers  # noqa: F401  (connects the M-Pesa signals)
