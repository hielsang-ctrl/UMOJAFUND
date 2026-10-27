from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("An email address is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, access=User.Access.ADMIN)
        return self._create(email, password, **extra)


class User(AbstractUser):
    """Every member of the group is a user. Sign-in is by email + password (JWT)."""

    class Access(models.TextChoices):
        ADMIN = "admin", "Admin"      # records payments and expenses
        MEMBER = "member", "Member"

    class Position(models.TextChoices):
        CHAIRPERSON = "Chairperson", "Chairperson"
        TREASURER = "Treasurer", "Treasurer"
        SECRETARY = "Secretary", "Secretary"
        MEMBER = "Member", "Member"

    username = None
    first_name = None
    last_name = None

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=12, blank=True, help_text="Stored as 2547XXXXXXXX")
    access = models.CharField(max_length=10, choices=Access.choices, default=Access.MEMBER)
    position = models.CharField(max_length=20, choices=Position.choices, default=Position.MEMBER)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    objects = UserManager()

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name or self.email

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name.split(" ")[0] if self.full_name else self.email

    @property
    def is_fund_admin(self):
        return self.access == self.Access.ADMIN

    @property
    def is_officer(self):
        return self.position != self.Position.MEMBER
