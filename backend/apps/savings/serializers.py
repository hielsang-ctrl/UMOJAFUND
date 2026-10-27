from rest_framework import serializers

from apps.common.phone import normalise_phone

from .constants import MAX_DEPOSIT, MIN_DAILY
from .models import SavingsDeposit, SavingsPlan
from .services import plan_stats


class DepositSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source="paid_on")

    class Meta:
        model = SavingsDeposit
        fields = ["id", "amount", "date", "reference"]


class SavingsPlanSerializer(serializers.ModelSerializer):
    """Expects the queryset from SavingsPlanViewSet (completed deposits prefetched as `done`)."""

    deposits = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = SavingsPlan
        fields = [
            "id", "name", "daily_amount", "period", "months", "start_date", "maturity_date",
            "status", "withdrawn_on", "withdrawn_amount", "deposits", "stats",
        ]

    def get_deposits(self, obj):
        return DepositSerializer(obj.done, many=True).data

    def get_stats(self, obj):
        return plan_stats(obj, obj.done)


class PlanCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    daily_amount = serializers.IntegerField(min_value=MIN_DAILY, max_value=MAX_DEPOSIT)
    period = serializers.ChoiceField(choices=SavingsPlan.Period.choices)


class _PhoneMixin(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        if value and not normalise_phone(value):
            raise serializers.ValidationError("Enter a valid Safaricom number, e.g. 0712 345 678.")
        return value


class DepositCreateSerializer(_PhoneMixin):
    amount = serializers.IntegerField(min_value=MIN_DAILY, max_value=MAX_DEPOSIT)


class WithdrawSerializer(_PhoneMixin):
    pass
