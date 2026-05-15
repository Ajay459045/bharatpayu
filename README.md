# BharatPayU

Production-grade BBPS fintech portal scaffold for admin, distributor, and retailer operations.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style UI primitives, Framer Motion, Zustand, TanStack Query, Axios, Zod, React Hook Form
- NestJS, Node.js 22, MongoDB/Mongoose, Redis/BullMQ, JWT auth
- Docker, Nginx, PM2, GitHub Actions

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:3000  
API: http://localhost:4000/api/v1/health

## Production

See [docs/deployment.md](docs/deployment.md) and [docs/api.md](docs/api.md).
