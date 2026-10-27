from rest_framework.response import Response
from rest_framework.views import APIView

from .services import fund_totals


class FundSummaryView(APIView):
    """GET /api/fund/summary/ - the numbers on the Overview page."""

    def get(self, request):
        return Response(fund_totals())
