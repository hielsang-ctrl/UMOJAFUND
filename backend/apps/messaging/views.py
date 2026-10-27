from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts import selectors

from . import delivery
from .models import Message
from .serializers import MessageCreateSerializer, MessageSerializer

User = get_user_model()


def resolve_recipients(audience, recipient):
    """Returns (list of users, label shown in 'Recently sent')."""
    if audience == Message.Audience.PENDING:
        users = list(selectors.members().filter(paid__lt=settings.TARGET_PER_MEMBER))
        return users, f"All pending members ({len(users)})"
    if audience == Message.Audience.ALL:
        users = list(selectors.members())
        return users, f"All members ({len(users)})"
    if audience == Message.Audience.ADMIN:
        users = list(User.objects.filter(is_active=True, access=User.Access.ADMIN))
        return users, "Admin"
    return [recipient], recipient.full_name


class MessageViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """The admin can message anyone or any group; members can only message the admin."""

    serializer_class = MessageSerializer

    def get_queryset(self):
        qs = Message.objects.all()
        return qs if self.request.user.is_fund_admin else qs.filter(sender=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not request.user.is_fund_admin and data["audience"] != Message.Audience.ADMIN:
            raise PermissionDenied("Members can only message the admin.")
        users, label = resolve_recipients(data["audience"], data.get("recipient"))
        message = Message.objects.create(
            sender=request.user, audience=data["audience"], recipient=data.get("recipient"),
            to_label=label, body=data["body"], recipient_count=len(users),
        )
        delivery.notify(users, data["body"], request.user)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
