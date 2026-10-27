from django.urls import path

from . import views

urlpatterns = [
    path("mpesa/status/<str:checkout_request_id>/", views.TransactionStatusView.as_view(), name="mpesa-status"),
    # Safaricom calls these three. The secret in the path comes from MPESA_CALLBACK_SECRET.
    path("mpesa/callback/<str:secret>/stk/", views.StkCallbackView.as_view(), name="mpesa-stk-callback"),
    path("mpesa/callback/<str:secret>/b2c/result/", views.B2CResultView.as_view(), name="mpesa-b2c-result"),
    path("mpesa/callback/<str:secret>/b2c/timeout/", views.B2CTimeoutView.as_view(), name="mpesa-b2c-timeout"),
]
