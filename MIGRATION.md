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

You also need a Traefik instance terminating TLS. Hostinger's template puts
it in `/docker/traefik/docker-compose.yml`.

**Check `ACME_EMAIL` before anything else.** The Traefik compose file reads
the Let's Encrypt account address from a variable:

```
--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
```

If there is no `.env` beside that compose file, the variable expands to an
empty string, ACME registration fails, and Traefik quietly serves its own
`TRAEFIK DEFAULT CERT` instead. Nothing in the logs says so at the default
`WARN` level. Create it first:

```bash
cd /docker/traefik
echo 'ACME_EMAIL=info@hangeul.com.bd' > .env
docker compose up -d --force-recreate
```

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

## 4. Carry the certificate across first

Do **not** rely on the new server obtaining its own certificate at cutover.
Let's Encrypt validates over HTTP against the live domain name, so the new
machine cannot prove ownership until DNS already points at it — which means
every visitor sees a browser security warning during the gap. Traefik also
does not retry on a schedule tight enough to close that gap; on this
migration it attempted once, failed against the old IP, and then sat idle.

Copy the working certificate instead, so the new server is already correct
the moment DNS moves. Both machines are yours, and the certificate covers
both names until it expires.

The new server refuses password SSH, so authorise a key first. On the
**old** server:

```bash
[ -f /root/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519
cat /root/.ssh/id_ed25519.pub
```

Paste that line on the **new** server:

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "<the public key>" > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Then export and send the certificate store. On the **old** server — check
`docker volume ls | grep letsencrypt` for the volume name, which is prefixed
with the Compose project:

```bash
docker run --rm -v traefik-wqiz_traefik-letsencrypt:/le -v /root:/out alpine \
  cp /le/acme.json /out/acme.json
scp /root/acme.json root@<new-ip>:/root/acme.json
```

Load it on the **new** server:

```bash
cd /docker/traefik
docker compose down
docker run --rm -v traefik_traefik-letsencrypt:/le -v /root:/in alpine \
  sh -c 'cp /in/acme.json /le/acme.json && chmod 600 /le/acme.json'
docker compose up -d
```

`acme.json` contains private keys. Delete the copies in `/root` on both
machines afterwards, and never commit it.

## 5. Verify, then move DNS

Prove the certificate is real **before** touching DNS — from your own
machine, not from the server:

```bash
echo | openssl s_client -connect <new-ip>:443 -servername hangeulglobal.com 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
curl -o /dev/null -w "%{http_code}\n" \
  --resolve hangeulglobal.com:443:<new-ip> https://hangeulglobal.com/
```

The issuer must read `C=US, O=Let's Encrypt`. **Never verify with `curl -k`**
— it ignores certificate validity entirely and reports a healthy 200 against
a placeholder certificate that every browser will reject. `--resolve` is the
right tool: it points the request at the new IP while still validating the
chain for the real hostname.

Only then change the `A` record for `hangeulglobal.com` to the new IP, TTL
300. The `www` CNAME points at the apex and needs no change.

Renewal happens normally on the new server once it owns the domain.

## 6. Decommission the old server

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
