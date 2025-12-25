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

## Production routing (recommended)
Operate the app on your custom domain and attach the Worker as a same-origin route:
- Pages: `https://langbridge.liveloop.app/*`
- Worker Route: `https://langbridge.liveloop.app/api/*` → this Worker

## Pages Preview / Worker Dev domain testing
When testing with the Pages preview URL (`*.pages.dev`), the origin differs from `*.workers.dev`.
The frontend supports an optional API base URL for Preview:
- Set Pages (Preview environment) var: `VITE_API_BASE_URL = https://<your-worker>.workers.dev`



