from django.contrib import admin

from .models import Comment, Post


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "author", "text")
    list_filter = ("kind",)
    search_fields = ("text", "author__full_name")
    inlines = [CommentInline]
