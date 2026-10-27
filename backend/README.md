# Umoja Fund backend

Django 5 + Django REST Framework, PostgreSQL, JWT (simplejwt) and the Safaricom **Daraja** API
(STK Push for money in, B2C for savings payouts).

> The code was written and syntax-checked but **not run**. Generate the migrations and run the tests
> (steps below) before trusting it with real money.

## Structure

```
backend/
├── manage.py
├── requirements.txt
├── .env.example                 copy to .env and fill in
├── Dockerfile / docker-compose.yml / .dockerignore
├── config/
│   ├── settings.py              env-driven: Postgres, JWT, CORS, throttling, M-Pesa
│   ├── urls.py                  mounts every app under /api/ plus /api/docs/
│   └── wsgi.py
└── apps/
    ├── common/                  TimeStampedModel, IsFundAdmin permission, phone normaliser, limits
    ├── accounts/                custom User (email login), JWT login/refresh/logout, members directory
    ├── fund/                    GET /fund/summary/ + the Postgres lock that stops overspending
    ├── contributions/           Payment model: cash (admin) and M-Pesa STK Push
    ├── expenses/                Expense ledger, balance check, one proof post per expense
    ├── posts/                   ideas and proof of work: photos, likes, comments
    ├── savings/                 personal locked plans (KES 50+/day), deposits, B2C withdrawal
    ├── messaging/               admin -> members messages (email now, SMS hook ready)
    └── mpesa/                   Daraja only: client.py, services.py, callbacks, admin, reconcile command
        └── certs/               put Safaricom's certificate here (needed for B2C)
```

Each app follows the same layout: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`,
and `services.py` / `receivers.py` where there is business logic.

**How M-Pesa is wired:** `mpesa` knows nothing about contributions or savings. When Safaricom calls back it
sends a signal (`stk_succeeded`, `stk_failed`, `payout_succeeded`, `payout_failed`); `contributions/receivers.py`
and `savings/receivers.py` listen and update their own records.

## Run it

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY and DATABASE_URL at least

# PostgreSQL (or: docker compose up -d db)
createdb umoja

python manage.py makemigrations accounts contributions expenses posts savings messaging mpesa
python manage.py migrate        # commit the generated migrations folders to git
python manage.py createsuperuser   # email + full name + password; it gets access=admin
python manage.py test
python manage.py runserver
```

Docs and a try-it-out page: `http://localhost:8000/api/docs/`. Admin site: `/admin/`.
With Docker: `docker compose up --build` (also runs the reconcile loop).

## Authentication (JWT)

| Endpoint | What it does |
|---|---|
| `POST /api/auth/login/` | `{email, password}` -> `{access, refresh, user}`. Limited to 5 attempts a minute. |
| `POST /api/auth/refresh/` | `{refresh}` -> new `access` and a new `refresh` (the old one is blacklisted). |
| `POST /api/auth/logout/` | `{refresh}` -> blacklists it. |
| `GET/PATCH /api/auth/me/` | your profile (name, phone). |
| `POST /api/auth/change-password/` | `{old_password, new_password}` |

Send `Authorization: Bearer <access>` on everything else. Access tokens last 15 minutes, refresh tokens 7 days.
The admin creates members with `POST /api/members/` (`name, email, phone, role, access, password`).

## Endpoints and the frontend

All JSON is snake_case. Every list is returned whole (no pagination) because the group is small.

| Frontend action (`FundContext`) | Endpoint | Who |
|---|---|---|
| members | `GET /members/` | everyone (phone/email hidden for non-officers unless you are admin) |
| totals | `GET /fund/summary/` | everyone |
| payments | `GET /payments/?member=&method=&status=` | everyone |
| `recordPayment` (cash) | `POST /payments/` `{member, amount, reference?}` | admin |
| M-Pesa contribution | `POST /payments/mpesa/` `{amount, phone?, member?}` -> `202 {checkout_request_id}` | member (self) / admin |
| poll the PIN prompt | `GET /mpesa/status/<checkout_request_id>/` -> `{status, done, receipt}` | payer / admin |
| expenses | `GET /expenses/` | everyone |
| `addExpense` | `POST /expenses/` `{title, vendor, amount, category, post?}` | admin, amount <= balance |
| `linkProof` | `PATCH /expenses/<id>/proof/` `{post}` | admin, one post per expense |
| posts | `GET /posts/?kind=&q=&sort=latest\|liked` | everyone |
| `addPost` | `POST /posts/` (multipart: `kind, text, image`) | everyone |
| `toggleLike` | `POST /posts/<id>/like/` | everyone |
| `addComment` | `POST /posts/<id>/comments/` `{text}` | everyone |
| `sendMessage` | `POST /messages/` `{audience: pending\|all\|admin\|member, recipient?, body}` | admin (members: `admin` only) |
| savings plans | `GET /savings/plans/` (only your own) | you |
| new plan | `POST /savings/plans/` `{name?, daily_amount>=50, period: quarterly\|semiannual\|annual}` | you |
| save | `POST /savings/plans/<id>/deposit/` `{amount>=50, phone?}` -> `202 {checkout_request_id}` | you |
| withdraw | `POST /savings/plans/<id>/withdraw/` `{phone?}` -> `202` | you, only after maturity |

Field differences to adapt in the frontend: a member's `role` is the position (Chairperson...) and `access`
is `admin`/`member` (use `access === "admin"` for `isAdmin`); `memberId` is `member_id`; `postId` is `post_id`;
a payment's `ref` is `reference`. Savings plans come with a `stats` object (saved, target, pace, behind,
days_left, can_deposit, can_withdraw...) so the page does not need to recompute it.

## Setting up M-Pesa (sandbox first)

1. Create an app on <https://developer.safaricom.co.ke> and copy the **consumer key/secret** into `.env`.
2. **STK Push:** use the sandbox shortcode `174379` and the passkey shown on the Daraja "Lipa Na M-Pesa Online" simulate page.
3. **Callbacks need a public https URL.** Locally run `ngrok http 8000` (or cloudflared) and set
   `MPESA_CALLBACK_BASE_URL=https://<your-tunnel>`. Safaricom will call
   `<base>/api/mpesa/callback/<MPESA_CALLBACK_SECRET>/stk/` (and `.../b2c/result/`, `.../b2c/timeout/`).
4. **B2C (savings withdrawals):** in the Daraja portal create the B2C test credentials, download the
   certificate to `apps/mpesa/certs/` and set `MPESA_CERT_PATH`, `MPESA_INITIATOR_NAME`,
   `MPESA_INITIATOR_PASSWORD`, `MPESA_B2C_SHORTCODE`. The backend encrypts the initiator password with that
   certificate to build the `SecurityCredential`.
5. Follow the sandbox test instructions in the Daraja portal for the test phone number and PIN behaviour.

### How money stays safe

* **Nothing is credited on the request.** A payment or deposit is `pending` until Safaricom's callback says
  success. Callbacks are idempotent: a repeated callback changes nothing.
* **Callback protection:** Safaricom does not sign callbacks, so the URL carries a secret (wrong secret = 404)
  and you can restrict by IP with `MPESA_CALLBACK_ALLOWED_IPS`. If you filter by IP, make sure your proxy sets
  `X-Forwarded-For` itself and strip it from client requests.
* **Lost callbacks:** `python manage.py reconcile_mpesa` asks Daraja about pushes still pending after 2 minutes.
  Run it every few minutes (the compose file does; otherwise cron). Payments settled this way get a placeholder
  reference because the status query has no receipt number.
* **Withdrawals:** the amount is computed on the server from completed deposits, only after the maturity date,
  and the plan is locked (`withdrawing`) before the B2C call, so double clicks cannot pay twice. Each payout carries
  a unique `OriginatorConversationID`. If Safaricom rejects it, the plan unlocks. If the answer is unclear
  (timeout), the payout becomes `unconfirmed` and the plan stays locked until an admin checks the M-Pesa portal and
  uses the **Mpesa transactions -> "money WAS / was NOT sent"** actions in `/admin/`. It is never retried automatically.
* **Spending:** expenses take a Postgres advisory lock while checking the balance, so two simultaneous expenses cannot
  overspend. Expenses are never edited or deleted.
* Anything unmatched (a callback for an unknown request) is logged at ERROR with its full payload, so no payment is lost silently.

## Before going live

- [ ] `DEBUG=False`, a long random `SECRET_KEY`, real `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` set to your frontend only.
- [ ] Serve over https behind a proxy that sets `X-Forwarded-Proto` (production settings turn on secure cookies and HSTS).
- [ ] Apply for Daraja **production** access: your Paybill/Till, Lipa Na M-Pesa passkey and the B2C API with its initiator;
      switch `MPESA_ENV=production` and use the *production* certificate. Put the secrets in your host's secret store, not git.
- [ ] Use a shared cache (Redis) as Django's `CACHES` default so login/M-Pesa throttling counts across all gunicorn workers.
- [ ] Store photos on S3/Cloudinary (`django-storages`) instead of local `media/`.
- [ ] Move `messaging.delivery.notify` and `reconcile_mpesa` to a worker/scheduler (Celery beat) and plug a real SMS provider into `send_sms`.
- [ ] Back up Postgres. Run `python manage.py test` against a staging database and do a real small-value STK and B2C test.
- [ ] Rotate any credential that was ever pasted into chat or committed.
