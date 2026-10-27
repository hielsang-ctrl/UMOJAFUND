from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import Message

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    to = serializers.CharField(source="to_label")
    date = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "to", "body", "date", "recipient_count"]

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).date().isoformat()


class MessageCreateSerializer(serializers.Serializer):
    audience = serializers.ChoiceField(choices=Message.Audience.choices)
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), required=False)
    body = serializers.CharField(max_length=320)

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write a message first.")
        return value

    def validate(self, attrs):
        if attrs["audience"] == Message.Audience.MEMBER and "recipient" not in attrs:
            raise serializers.ValidationError({"recipient": "Choose who to message."})
        return attrs
