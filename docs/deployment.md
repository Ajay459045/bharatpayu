# Deployment Guide

## Ubuntu VPS

1. Install Node.js 22 LTS, pnpm, Docker, Docker Compose, PM2, Nginx, and Certbot.
2. Copy `.env.example` to `.env` and configure MongoDB, Redis, JWT secrets, and DigiSeva credentials.
3. Run `pnpm install`, `pnpm build`, then `pm2 start ecosystem.config.js`.
4. Put Nginx in front of the web and API services using `infra/nginx.conf`.
5. Enable TLS with Certbot and force HTTPS.

## Docker

```bash
cp .env.example .env
docker compose up --build -d
```

## Production Checklist

- Rotate JWT and DigiSeva secrets outside Git.
- Use MongoDB Atlas backups or self-hosted replica sets.
- Require HTTPS and secure cookies.
- Set Redis persistence and memory policy.
- Add provider webhook IP allowlists.
- Monitor queues, pending transactions, API success ratio, and settlement retries.
