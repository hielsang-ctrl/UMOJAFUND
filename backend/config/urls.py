from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.fund.urls")),
    path("api/", include("apps.contributions.urls")),
    path("api/", include("apps.expenses.urls")),
    path("api/", include("apps.posts.urls")),
    path("api/", include("apps.savings.urls")),
    path("api/", include("apps.messaging.urls")),
    path("api/", include("apps.mpesa.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
