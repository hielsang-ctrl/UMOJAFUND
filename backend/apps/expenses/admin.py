from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("spent_on", "title", "category", "amount", "post")
    list_filter = ("category", "spent_on")
    search_fields = ("title", "vendor")
