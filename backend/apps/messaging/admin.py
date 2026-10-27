from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "sender", "to_label", "recipient_count", "body")
    readonly_fields = [f.name for f in Message._meta.fields]
