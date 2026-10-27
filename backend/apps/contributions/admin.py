from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("paid_on", "member", "amount", "method", "status", "reference")
    list_filter = ("method", "status", "paid_on")
    search_fields = ("member__full_name", "member__email", "reference")
    readonly_fields = ("created_at", "updated_at")
