# Hangeul Global Learning Center — website

Student-facing site for HGLC (Dhaka): course catalogue, student accounts,
online enrolment and payment. Korean and English courses, on campus and online.

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Database + auth**: Supabase (Postgres with Row Level Security)
- **Payments**: SSLCommerz (BDT — bKash / Nagad / Rocket / cards), Stripe (USD),
  and manual bKash/Nagad transfer with admin verification
- **Languages**: English and Korean, switchable from the navbar

---

## 1. Install

```bash
npm install
cp .env.example .env.local     # then fill it in (see below)
npm run dev
```

Until Supabase keys are present the site renders a short setup checklist
instead of crashing.

## 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) — the **Singapore**
   region is the closest to Dhaka.
2. SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql), then
   [`supabase/seed.sql`](supabase/seed.sql).
3. Project Settings → API: copy the project URL, the `anon` key and the
   `service_role` key into `.env.local`.
4. Authentication → URL Configuration:
   - **Site URL**: `http://localhost:3000` (your real domain in production)
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and
     `https://yourdomain.com/auth/callback`
5. Authentication → Providers → Email: leave "Confirm email" on. Supabase's
   built-in mailer is rate-limited, so add SMTP before launch
   (Project Settings → Auth → SMTP).

### Making yourself an admin

Sign up through the site, then in the SQL Editor:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

`/admin` then shows manual payments awaiting verification, recent payments and
contact-form messages.

## 3. Payments

### SSLCommerz (main method — BDT)

Covers bKash, Nagad, Rocket, cards and net banking through one integration.

1. Register at [developer.sslcommerz.com](https://developer.sslcommerz.com/registration/)
   for sandbox credentials; apply for a live merchant account separately.
2. Put the store ID and password in `.env.local`, keep `SSLCZ_SANDBOX=true`
   while testing.
3. In the SSLCommerz merchant panel set the IPN URL to
   `https://yourdomain.com/api/payments/sslcommerz/ipn`.

Money is only ever marked received after a server-to-server call to
SSLCommerz's validation API — the browser redirect alone is never trusted.
The IPN and the redirect both settle the same transaction idempotently.

### Stripe (international — USD)

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. In production add the
endpoint under Stripe → Developers → Webhooks, subscribing to
`checkout.session.completed` and `checkout.session.expired`.

### Manual transfer

Students send money to the bKash/Nagad numbers in `.env.local`, then submit the
TrxID. The payment sits in `pending_review` until an admin confirms it at
`/admin`, which activates the enrolment. TrxIDs are unique, so the same slip
cannot be submitted twice.

## 4. Editing courses, batches and prices

Everything the catalogue shows lives in the `courses` and `batches` tables —
edit them in the Supabase table editor, no deploy needed.

- **`courses`** — title, summary, description and outcomes in both languages,
  level, duration, `price_bdt`, `price_usd`, `sort_order`, `is_active`.
- **`batches`** — one row per intake. `mode` is `offline`, `online` or `hybrid`;
  `schedule_text` and `room_or_link` are shown to enrolled students.
  `seats_taken` is maintained automatically by a trigger.

To hide a course, set `is_active = false`. To close a batch, `is_open = false`.

## 5. Deploy

Vercel is the least-effort host for this stack: import the repo, paste the same
environment variables, set `NEXT_PUBLIC_SITE_URL` to the real domain, deploy.

It also runs on a Hostinger VPS with Node 20+:

```bash
npm ci && npm run build && npm start   # behind nginx on port 3000
```

After deploying, update:

- `NEXT_PUBLIC_SITE_URL`
- Supabase Site URL + redirect URLs
- the SSLCommerz IPN URL
- the Stripe webhook endpoint

## Project layout

```
src/
  app/
    page.tsx                      home
    courses/                      catalogue + course detail with batches
    login, signup, forgot-password, reset-password
    auth/callback/                Supabase email-link handler
    dashboard/                    student: enrolments, payments, profile
    checkout/[id]/                three payment methods + result screen
    admin/                        manual payment verification, messages
    api/payments/                 SSLCommerz callback + IPN, Stripe webhook
    actions/                      server actions (auth, enrol, payments, admin)
  components/                     navbar, footer, cards, forms, map
  lib/
    supabase/                     browser / server / service-role clients
    payments/                     SSLCommerz client, Stripe, settle logic
    i18n/                         English + Korean dictionaries
supabase/
  schema.sql                      tables, RLS policies, triggers
  seed.sql                        five courses, two batches each
```

## Security notes

- Students have no `UPDATE` policy on `payments`. Only the service-role key —
  used by gateway callbacks and admin approval — can set a payment to `paid`.
- Prices are read from the database inside server actions, never from form
  fields, so the amount charged cannot be altered from the browser.
- `settlePayment` rejects a settlement whose captured amount is below the
  recorded fee.
- The service-role key is server-only and must never be added to a
  `NEXT_PUBLIC_*` variable.
