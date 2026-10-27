from rest_framework import serializers

from apps.posts.models import Post

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source="spent_on", read_only=True)
    post_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Expense
        fields = ["id", "title", "vendor", "amount", "category", "date", "post_id"]


class ExpenseCreateSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.filter(kind=Post.Kind.PROOF), required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = ["title", "vendor", "amount", "category", "post"]

    def validate_post(self, post):
        if post and Expense.objects.filter(post=post).exists():
            raise serializers.ValidationError("That proof post already backs another expense.")
        return post


class LinkProofSerializer(serializers.Serializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.filter(kind=Post.Kind.PROOF))
