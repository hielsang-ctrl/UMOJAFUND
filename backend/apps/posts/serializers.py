from django.utils import timezone
from rest_framework import serializers

from .models import Comment, Post

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "text", "created_at"]


class PostSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.full_name", read_only=True)
    author_id = serializers.IntegerField(read_only=True)
    date = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    likes = serializers.IntegerField(source="likes_count", read_only=True)
    liked = serializers.BooleanField(source="liked_by_me", read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    expense_id = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "author", "author_id", "kind", "text", "image", "date", "likes", "liked", "comments", "expense_id"]

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).date().isoformat()

    def get_image(self, obj):
        if not obj.image:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

    def get_expense_id(self, obj):
        return obj.expense.pk if hasattr(obj, "expense") else None


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["kind", "text", "image"]
        extra_kwargs = {"image": {"required": False}}

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write something first.")
        return value

    def validate_image(self, value):
        if value is None:
            return value
        if value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Photos can be at most 5 MB.")
        fmt = getattr(getattr(value, "image", None), "format", None)
        if fmt not in ALLOWED_FORMATS:
            raise serializers.ValidationError("Use a JPEG, PNG or WebP photo.")
        return value


class CommentCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=500)

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write a comment first.")
        return value
