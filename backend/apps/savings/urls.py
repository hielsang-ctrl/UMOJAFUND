from rest_framework.routers import DefaultRouter

from .views import SavingsPlanViewSet

router = DefaultRouter()
router.register("savings/plans", SavingsPlanViewSet, basename="savings-plan")
urlpatterns = router.urls
