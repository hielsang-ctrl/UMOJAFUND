from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.common.limits import MAX_MPESA_AMOUNT
from apps.common.phone import normalise_phone

from .models import Payment

User = get_user_model()
active_members = User.objects.filter(is_active=True)


class PaymentSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="member.full_name", read_only=True)
    date = serializers.DateField(source="paid_on", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "member_id", "name", "amount", "method", "reference", "date", "status"]


class CashPaymentSerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=active_members)
    amount = serializers.IntegerField(min_value=1, max_value=1_000_000)
    reference = serializers.CharField(required=False, allow_blank=True, max_length=40)

    def validate_reference(self, value):
        if value and Payment.objects.filter(reference=value.strip()).exists():
            raise serializers.ValidationError("A payment with that reference already exists.")
        return value


class MpesaPaymentSerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=active_members, required=False)
    amount = serializers.IntegerField(min_value=1, max_value=MAX_MPESA_AMOUNT)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        if value and not normalise_phone(value):
            raise serializers.ValidationError("Enter a valid Safaricom number, e.g. 0712 345 678.")
        return value
