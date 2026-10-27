from django.contrib import admin

from .models import SavingsDeposit, SavingsPlan


class DepositInline(admin.TabularInline):
    model = SavingsDeposit
    extra = 0
    can_delete = False
    readonly_fields = ("amount", "status", "reference", "paid_on")


@admin.register(SavingsPlan)
class SavingsPlanAdmin(admin.ModelAdmin):
    list_display = ("owner", "name", "period", "daily_amount", "start_date", "maturity_date", "status", "withdrawn_amount")
    list_filter = ("status", "period")
    search_fields = ("owner__full_name", "owner__email", "name")
    inlines = [DepositInline]
