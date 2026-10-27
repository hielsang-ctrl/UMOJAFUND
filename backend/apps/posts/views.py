from django.db.models import Count, Exists, OuterRef, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Comment, Like, Post
from .serializers import CommentCreateSerializer, CommentSerializer, PostCreateSerializer, PostSerializer


class PostViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    Ideas and proof of work. Any member can post, like and comment. Linking proof to an expense
    is admin-only and lives on the expenses endpoint.
    Query params for the list: kind=proof|idea, q=search text or author, sort=latest|liked.
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = (
            Post.objects.select_related("author", "expense")
            .prefetch_related("comments__author")
            .annotate(
                likes_count=Count("likes", distinct=True),
                liked_by_me=Exists(Like.objects.filter(post=OuterRef("pk"), user=self.request.user)),
            )
        )
        params = self.request.query_params
        if params.get("kind") in (Post.Kind.PROOF, Post.Kind.IDEA):
            qs = qs.filter(kind=params["kind"])
        if params.get("q"):
            qs = qs.filter(Q(text__icontains=params["q"]) | Q(author__full_name__icontains=params["q"]))
        return qs.order_by("-likes_count", "-id") if params.get("sort") == "liked" else qs.order_by("-id")

    def get_serializer_class(self):
        return PostCreateSerializer if self.action == "create" else PostSerializer

    def create(self, request, *args, **kwargs):
        serializer = PostCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save(author=request.user)
        fresh = self.get_queryset().get(pk=post.pk)
        return Response(PostSerializer(fresh, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.pk and not self.request.user.is_fund_admin:
            raise PermissionDenied("You can only delete your own posts.")
        if hasattr(instance, "expense"):
            raise PermissionDenied("This post is the proof for an expense, so it cannot be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        """Toggles your like. Returns the new count."""
        post = self.get_object()
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        return Response({"liked": created, "likes": post.likes.count()})

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        post = self.get_object()
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = Comment.objects.create(post=post, author=request.user, text=serializer.validated_data["text"])
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
