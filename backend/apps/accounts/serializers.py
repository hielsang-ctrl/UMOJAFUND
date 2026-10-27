from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.common.phone import normalise_phone

from .models import User


class MemberSerializer(serializers.ModelSerializer):
    """
    Shape the frontend's member cards expect.
    `role` is the position (Chairperson, Treasurer...), `access` is admin/member.
    Phone and email are private: visible to admins, officers and the person themselves.
    """

    name = serializers.CharField(source="full_name")
    role = serializers.CharField(source="position")
    paid = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = ["id", "name", "email", "phone", "role", "access", "paid", "is_active"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        viewer = self.context["request"].user
        if not (viewer.is_fund_admin or viewer.pk == instance.pk or instance.is_officer):
            data["email"] = None
            data["phone"] = None
        return data


class MemberWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name", max_length=150)
    role = serializers.ChoiceField(source="position", choices=User.Position.choices, required=False)
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["name", "email", "phone", "role", "access", "password"]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_phone(self, value):
        if not value:
            return ""
        phone = normalise_phone(value)
        if not phone:
            raise serializers.ValidationError("Enter a valid Kenyan mobile number, e.g. 0712 345 678.")
        return phone

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A starting password is required."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ProfileSerializer(serializers.ModelSerializer):
    """What a member may change about themselves."""

    name = serializers.CharField(source="full_name", max_length=150)

    class Meta:
        model = User
        fields = ["name", "phone"]

    def validate_phone(self, value):
        if not value:
            return ""
        phone = normalise_phone(value)
        if not phone:
            raise serializers.ValidationError("Enter a valid Kenyan mobile number, e.g. 0712 345 678.")
        return phone


class LoginSerializer(TokenObtainPairSerializer):
    """POST {email, password} -> {access, refresh, user}."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["name"] = user.full_name
        token["access_level"] = user.access
        token["position"] = user.position
        return token

    def validate(self, attrs):
        attrs["email"] = attrs.get("email", "").strip().lower()
        data = super().validate(attrs)
        data["user"] = {"id": self.user.pk, "name": self.user.full_name, "access": self.user.access, "role": self.user.position}
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("That is not your current password.")
        return value
