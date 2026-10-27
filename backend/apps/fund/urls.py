from django.urls import path

from .views import FundSummaryView

urlpatterns = [path("fund/summary/", FundSummaryView.as_view(), name="fund-summary")]
