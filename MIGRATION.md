# Moving the site to a new VPS

The website is a **Next.js application**, not PHP. It runs as a Docker
container built by GitHub Actions, so migrating is mostly a matter of
pointing a new machine at the same image and the same database.

**Nothing lives only on the server.** Source is on GitHub, data is in
Supabase, uploaded receipts are in Supabase Storage. The VPS holds only two
things you cannot regenerate:

1. `/docker/hglc/.env` — the secrets
2. the DNS record pointing at its IP

Copy those and the move is done. Everything else is a rebuild.

---

## Before you start

Take a copy of the environment file from the **old** server:

```bash
cat /docker/hglc/.env
```

Save that output somewhere safe. It contains the Supabase service-role key
and the SMTP password — treat it like a password list, and do not paste it
into a repository or a chat you would not want read later.

---

## 1. Prepare the new VPS

Ubuntu 24.04 with Docker. Hostinger's "Ubuntu 24.04 with Docker and Traefik"
template gives you Docker, Compose and Traefik already wired up, which is
what the current server runs.

If you build it yourself instead:

```bash
curl -fsSL https://get.docker.com | sh
```

You also need a Traefik instance terminating TLS. The current one lives in
`/docker/traefik-wqiz/docker-compose.yml`; copy that file across and start
it before the site.

---

## 2. Create the project

```bash
mkdir -p /docker/hglc
cd /docker/hglc
```

Write `docker-compose.yml` — the same file that is in this repository:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/captain1995353/hglc-website/main/docker-compose.yml \
  -o docker-compose.yml
```

Then write `.env` with the values you copied from the old server:

```bash
cat > /docker/hglc/.env <<'EOF'
NEXT_PUBLIC_SITE_URL=https://hangeulglobal.com
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SSLCZ_STORE_ID=
SSLCZ_STORE_PASSWORD=
SSLCZ_SANDBOX=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your workspace address>
SMTP_PASS=<16-character app password>
MAIL_FROM=noreply@hangeul.com.bd
NEXT_PUBLIC_CONTACT_EMAIL=info@hangeul.com.bd
EOF
```

## 3. Start it

```bash
cd /docker/hglc && docker compose up -d --pull always
```

The image comes from GHCR, already built — nothing compiles on the server.
It should be running within a minute.

Check it before touching DNS, using the new server's IP:

```bash
curl -H "Host: hangeulglobal.com" http://<new-ip>/ -I
```

## 4. Move DNS

Only once step 3 answers. Change the `A` record for `hangeulglobal.com` from
the old IP to the new one, TTL 300. The `www` CNAME needs no change.

Traefik requests a fresh Let's Encrypt certificate the first time a request
arrives on the new machine, so give it a minute before judging.

## 5. Decommission the old server

Leave it running for a day or two — DNS caches, and rolling back is just
changing the record again. When you are satisfied:

```bash
cd /docker/hglc && docker compose down
```

---

## What does not move

| | Where it lives | Action |
| --- | --- | --- |
| Source code | GitHub | nothing |
| Container image | GHCR | nothing |
| Students, payments, classes | Supabase | nothing |
| Uploaded receipts | Supabase Storage | nothing |
| Site settings, prices, courses | Supabase | nothing |
| Secrets | `/docker/hglc/.env` | **copy across** |
| DNS | Hostinger DNS | **repoint** |

Because the database is hosted by Supabase rather than on the VPS, no data
migration is involved and there is no downtime window to plan around. Both
servers can talk to it at once, which is what makes the cutover safe.

## Other things worth updating after the move

- Nothing in Supabase needs changing — the site URL is unchanged.
- If you also move the domain, update Supabase → Authentication → URL
  Configuration, and the SSLCommerz IPN URL, to match.
