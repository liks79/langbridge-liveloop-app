# API Worker (Cloudflare Workers)

This Worker provides same-domain API endpoints under `/api/*` and proxies Gemini calls so **the browser never sees the API key**.

## Endpoints
- `POST /api/analyze`
- `POST /api/quiz`
- `POST /api/tts`

## Secrets
Set the Gemini API key as a Worker secret (do not commit it):
- `wrangler secret put GEMINI_API_KEY`

## Local dev
1. From `workers/api/`: `npm run dev` (or `wrangler dev`)
2. In the web app, `/api/*` is proxied in Vite dev config (see `vite.config.ts`).


