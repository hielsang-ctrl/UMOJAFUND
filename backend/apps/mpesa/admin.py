from django.contrib import admin, messages

from . import services
from .models import MpesaTransaction


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "purpose", "phone", "amount", "status", "receipt", "result_desc")
    list_filter = ("kind", "purpose", "status")
    search_fields = ("phone", "receipt", "checkout_request_id", "originator_conversation_id")
    date_hierarchy = "created_at"
    actions = ["mark_payout_sent", "mark_payout_not_sent"]

    def has_add_permission(self, request):
        return False  # rows are created by the API only

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    @admin.action(description="UNCONFIRMED payout: I checked the M-Pesa portal, the money WAS sent")
    def mark_payout_sent(self, request, queryset):
        for txn in queryset.filter(kind="b2c"):
            services.settle_b2c_manually(txn.pk, sent=True)
        self.message_user(request, "Marked as sent.", messages.SUCCESS)

    @admin.action(description="UNCONFIRMED payout: I checked the M-Pesa portal, the money was NOT sent")
    def mark_payout_not_sent(self, request, queryset):
        for txn in queryset.filter(kind="b2c"):
            services.settle_b2c_manually(txn.pk, sent=False)
        self.message_user(request, "Marked as not sent. The member can withdraw again.", messages.SUCCESS)
