from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsFundAdmin(BasePermission):
    """Only users with access == "admin" (the person who records payments and expenses)."""

    message = "Only the fund admin can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_fund_admin)


class IsFundAdminOrReadOnly(BasePermission):
    message = "Only the fund admin can change this."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or request.user.is_fund_admin
