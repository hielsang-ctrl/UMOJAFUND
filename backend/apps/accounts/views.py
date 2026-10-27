from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.common.permissions import IsFundAdmin

from . import selectors
from .serializers import (ChangePasswordSerializer, LoginSerializer, LogoutSerializer, MemberSerializer,
                          MemberWriteSerializer, ProfileSerializer)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"  # 5 attempts a minute, see REST_FRAMEWORK in settings


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []


class LogoutView(APIView):
    """Blacklists the refresh token so it can never be used again."""

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            pass  # already expired or blacklisted: the goal (token unusable) is met
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        me = selectors.members().get(pk=request.user.pk)
        return Response(MemberSerializer(me, context={"request": request}).data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.get(request)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password changed. Sign in again on your other devices."})


class MemberViewSet(viewsets.ModelViewSet):
    """Directory for everyone; only the admin can add, edit or deactivate members."""

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return selectors.members().order_by("full_name")

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsFundAdmin()]

    def get_serializer_class(self):
        return MemberSerializer if self.action in ("list", "retrieve") else MemberWriteSerializer

    def _respond(self, instance, code):
        fresh = selectors.members().get(pk=instance.pk)
        return Response(MemberSerializer(fresh, context={"request": self.request}).data, status=code)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._respond(serializer.save(), status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return self._respond(serializer.save(), status.HTTP_200_OK)

    def perform_destroy(self, instance):
        # Members who paid in keep their history, so we deactivate instead of deleting.
        if instance.pk == self.request.user.pk:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You cannot deactivate your own account.")
        instance.is_active = False
        instance.save(update_fields=["is_active"])
