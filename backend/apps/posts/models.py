from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Post(TimeStampedModel):
    class Kind(models.TextChoices):
        PROOF = "proof", "Proof of work"
        IDEA = "idea", "Idea"

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="posts")
    kind = models.CharField(max_length=5, choices=Kind.choices, default=Kind.PROOF)
    text = models.TextField(max_length=2000)
    image = models.ImageField(upload_to="posts/%Y/%m/", blank=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.get_kind_display()} by {self.author}: {self.text[:40]}"


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["post", "user"], name="one_like_per_user_per_post")]


class Comment(TimeStampedModel):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    text = models.CharField(max_length=500)

    class Meta:
        ordering = ["id"]
