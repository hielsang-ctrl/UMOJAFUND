from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # project
    "apps.common",
    "apps.accounts",
    "apps.fund",
    "apps.contributions",
    "apps.expenses",
    "apps.posts",
    "apps.savings",
    "apps.messaging",
    "apps.mpesa",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# ---------------------------------------------------------------- database
DATABASES = {"default": env.db("DATABASE_URL")}  # postgres://user:pass@host:5432/dbname
DATABASES["default"]["CONN_MAX_AGE"] = 60
# Postgres advisory locks (apps/fund/services.py) are used to stop two expenses overspending the balance.

# ---------------------------------------------------------------- auth
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "login": "5/min",   # brute-force guard on /auth/login/
        "mpesa": "10/min",  # each call here pops a PIN prompt on someone's phone
    },
    # The group is small, so lists are returned whole. Add pagination here if it grows.
    "DEFAULT_PAGINATION_CLASS": None,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,       # every refresh issues a new refresh token...
    "BLACKLIST_AFTER_ROTATION": True,    # ...and the old one stops working
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Umoja Fund API",
    "DESCRIPTION": "Group fund, expenses, proof of work, personal savings and M-Pesa (Daraja).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])

# ---------------------------------------------------------------- i18n
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"  # "today" for savings and the ledger means today in Kenya
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------- static / media
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"  # production: use S3/Cloudinary via django-storages
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------- fund rules
GROUP_NAME = env("GROUP_NAME", default="Umoja Group Fund")
TARGET_PER_MEMBER = env.int("TARGET_PER_MEMBER", default=5000)

# ---------------------------------------------------------------- M-Pesa (Daraja)
def mpesa_env(name, default=""):
    """Reads a value and drops any trailing " # comment" a .env line may carry."""
    return env(name, default=default).split(" #")[0].strip()


MPESA = {
    "ENV": mpesa_env("MPESA_ENV", default="sandbox"),
    "CONSUMER_KEY": mpesa_env("MPESA_CONSUMER_KEY", default=""),
    "CONSUMER_SECRET": mpesa_env("MPESA_CONSUMER_SECRET", default=""),
    "SHORTCODE": mpesa_env("MPESA_SHORTCODE", default="174379"),
    "PASSKEY": mpesa_env("MPESA_PASSKEY", default=""),
    "TRANSACTION_TYPE": mpesa_env("MPESA_TRANSACTION_TYPE", default="CustomerPayBillOnline"),
    "PARTY_B": mpesa_env("MPESA_PARTY_B", default="") or mpesa_env("MPESA_SHORTCODE", default="174379"),
    "B2C_SHORTCODE": mpesa_env("MPESA_B2C_SHORTCODE", default=""),
    "INITIATOR_NAME": mpesa_env("MPESA_INITIATOR_NAME", default=""),
    "INITIATOR_PASSWORD": mpesa_env("MPESA_INITIATOR_PASSWORD", default=""),
    "SECURITY_CREDENTIAL": mpesa_env("MPESA_SECURITY_CREDENTIAL", default=""),
    "CERT_PATH": BASE_DIR / mpesa_env("MPESA_CERT_PATH", default="apps/mpesa/certs/SandboxCertificate.cer"),
    "CALLBACK_BASE_URL": mpesa_env("MPESA_CALLBACK_BASE_URL", default="").rstrip("/"),
    "CALLBACK_SECRET": mpesa_env("MPESA_CALLBACK_SECRET", default=""),
    "CALLBACK_ALLOWED_IPS": env.list("MPESA_CALLBACK_ALLOWED_IPS", default=[]),
}

# ---------------------------------------------------------------- email
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Umoja Fund <no-reply@example.com>")

# ---------------------------------------------------------------- production hardening
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"std": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "std"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
