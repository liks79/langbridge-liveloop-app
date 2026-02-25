# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LangBridge is an AI-powered English learning platform for Korean speakers. It uses Google Gemini API for text analysis, translation, text-to-speech, quiz generation, and daily expression recommendations.

## Commands

### Frontend (root)
```bash
npm run dev          # Vite dev server on localhost:5173
npm run build        # tsc -b && vite build (production)
npm run lint         # ESLint
npm run test:run     # Run all tests once (Vitest)
npm run test         # Vitest in watch mode
```

### Worker backend (workers/api/)
```bash
cd workers/api && npm run dev     # wrangler dev on localhost:8787
cd workers/api && npm run deploy  # Deploy to Cloudflare
```

### Full local development (two terminals required)
- Terminal 1: `npm run dev` (frontend; proxies `/api/*` to port 8787)
- Terminal 2: `cd workers/api && npm run dev` (worker)

### Run a single test file
```bash
npx vitest run src/lib/vocabStore.test.ts
```

## Architecture

This is a **frontend + Cloudflare Worker** monorepo deployed as a single Cloudflare Workers project.

### Frontend (`src/`)
- React 19 SPA with TypeScript, Vite 7, Tailwind CSS 4
- **State**: React hooks only — no external state library
- **Data persistence**: All user data (history, vocabulary, streak, daily expression cache) stored in browser `localStorage` via stores in `src/lib/`
- **API calls**: `src/lib/apiClient.ts` — wraps `fetch` with exponential-backoff retry on HTTP 429

### Worker backend (`workers/api/src/index.ts`)
- Single-file Cloudflare Worker (~600 lines) handling all `/api/*` routes
- Routes: `POST /api/analyze`, `/api/quiz`, `/api/tts`, `/api/topic`, `/api/daily-expression`, `/api/dialogue`
- CORS enforced via `ALLOWED_ORIGINS` env var; empty = allow all
- Calls Google Gemini API for all AI features; all responses use JSON mode
- TTS converts Gemini's PCM16 output to WAV in-worker

### Deployment (`wrangler.toml`)
- `main = "workers/api/src/index.ts"` — Worker entry point
- `assets.directory = "./dist"` — Serves frontend build from Cloudflare Workers Assets
- Vite proxy (`/api` → `http://127.0.0.1:8787`) used only during local dev

## Environment Variables

Copy `.dev.vars.example` to `.dev.vars` at the repo root for local development.

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed CORS origins |
| `GEMINI_TEXT_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_TTS_MODEL` | No | Defaults to `gemini-2.5-flash-preview-tts` |

In production, `GEMINI_API_KEY` and `ALLOWED_ORIGINS` are set in the Cloudflare Dashboard (not in `wrangler.toml`).

## Language Detection

`src/lib/detectMode.ts` checks for Korean characters (`/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/`) to set `detectedMode`:
- `'EtoK'` — English input → analyze nuance, grammar, keywords
- `'KtoE'` — Korean input → translate to natural English

## Key LocalStorage Keys

| Key | Purpose |
|---|---|
| `english-live-loop-history` | Learning history |
| `langbridge-vocab-v1` | Vocabulary (max 300 items) |
| `langbridge-streak` | Daily streak counter |
| `langbridge-daily-expression` | Daily expression cache (date-keyed) |
