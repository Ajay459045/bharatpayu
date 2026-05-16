# Deployment Guide

## Ubuntu VPS

1. Install Node.js 22 LTS, pnpm, Docker, Docker Compose, PM2, Nginx, and Certbot.
2. Copy `.env.example` to `.env` and configure MongoDB, Redis, JWT secrets, TOTP encryption, and DigiSeva credentials.
3. Set `NEXT_PUBLIC_API_URL=https://bharatpayu.com/api/v1`. Do not use HTTP or localhost in production builds.
4. Clear the cached Next.js build output, then rebuild:

```bash
rm -rf apps/web/.next
npm run build --workspace @bharatpayu/web
```

5. Run `npm install`, `npm run build`, then `pm2 start ecosystem.config.js`.
6. Put Nginx in front of the web and API services using `infra/nginx.conf`.
7. Enable TLS with Certbot and force HTTPS.

## Production API URL

The frontend must call the public HTTPS API endpoint:

```env
NEXT_PUBLIC_API_URL=https://bharatpayu.com/api/v1
```

Never use `localhost`, `127.0.0.1`, or `http://bharatpayu.com` for a production frontend build. Next.js embeds `NEXT_PUBLIC_*` values at build time, so rebuild the web app after changing this value.

## Authenticator 2FA

Google Authenticator compatible TOTP is controlled by these backend variables:

```env
TOTP_ISSUER=BharatPayU
TOTP_SECRET_ENCRYPTION_KEY=replace-with-32-byte-random-production-secret
TOTP_ENFORCE_ADMIN=false
```

Use a long random `TOTP_SECRET_ENCRYPTION_KEY` in production and never rotate it without first migrating stored 2FA secrets. Set `TOTP_ENFORCE_ADMIN=true` only after at least one admin can complete the setup flow, because admin logins will be forced through authenticator setup/verification before final JWT issuance.

## Nginx API Proxy

Use this API location block for the VPS deployment:

```nginx
location /api/ {
    # No trailing slash in proxy_pass: it preserves /api for NestJS.
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    proxy_redirect off;
}
```

The `proxy_pass` value intentionally has no trailing slash. With a trailing slash, Nginx can rewrite `/api/v1/...` to `/v1/...`, which causes `Cannot POST /v1/auth/login`.

## Docker

```bash
cp .env.example .env
docker compose up --build -d
```

## Production Checklist

- Rotate JWT and DigiSeva secrets outside Git.
- Rotate and store `TOTP_SECRET_ENCRYPTION_KEY` in the server secret manager, not in Git.
- Use MongoDB Atlas backups or self-hosted replica sets.
- Require HTTPS and secure cookies.
- Enable authenticator 2FA for admin and finance operations.
- Set Redis persistence and memory policy.
- Add provider webhook IP allowlists.
- Monitor queues, pending transactions, API success ratio, and settlement retries.
