# Setup & Local Development Guide

## 1. Prerequisites

- **Node.js 20+ LTS** (with `npm`)
- Optional for live AI: **Google Gemini API Key** (`GEMINI_API_KEY`)
- Optional for cloud persistence: **Supabase Project** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Variables

| Variable | Side | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend (optional) | Supabase project URL for client auth |
| `VITE_SUPABASE_ANON_KEY` | Frontend (optional) | Public anon key (protected by RLS) |
| `SUPABASE_URL` | Server-only | Supabase URL for Edge/Node admin operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Privileged key for `purgeExpiredMedia` & server XP validation |
| `GEMINI_API_KEY` | Server-only | Google Gemini API key (never prefix with `VITE_`) |
| `GEMINI_MODEL` | Server-only | Configurable Gemini model ID (default: `gemini-2.5-flash`) |
| `PORT` | Server-only | Local API server port (default: `8787`) |
| `PURGE_ALERT_WEBHOOK_URL` | Server-only | Optional webhook for persistent purge failure alerts |

> **Development Mode Notice**: If `GEMINI_API_KEY` or Supabase credentials are omitted, the backend automatically runs in a clearly labeled **Development Mode** with deterministic local persistence (`server/.data/`) and honest AI mock responses so every user flow can be tested without exposing credentials or faking live AI calls.

---

## 3. Install & Run Locally

```bash
npm install
npm run dev
```

This starts:
- Vite frontend (`http://localhost:5173`) with `/api` proxy
- Secure Node/TypeScript API server (`http://localhost:8787`) + 5-minute `purgeExpiredMedia` scheduler

---

## 4. Verification & Testing

```bash
npm run typecheck      # Strict TypeScript check
npm run lint           # ESLint check
npm run test           # Vitest unit & integration tests
npm run build          # Production Vite + PWA bundle
```
