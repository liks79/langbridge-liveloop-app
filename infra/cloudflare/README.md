# Cloudflare (Pages + Workers + Access) 운영 가이드

## 목표 구조
- **Cloudflare Pages**: 프론트엔드(정적 자산)
- **Cloudflare Workers**: 같은 도메인에서 `/api/*` 경로를 처리 (Gemini 호출 프록시)
- **Cloudflare Access(Zero Trust)**: 팀/지인만 접근 가능하도록 사이트 전체(+ `/api/*`) 보호

## 1) Pages 설정
- **Build command**: `npm run build`
- **Output directory**: `dist`

## 2) Workers 설정
- Worker 코드는 `workers/api/`에 있습니다.
- 배포/로컬 개발은 Wrangler 사용을 권장합니다.

### Secrets (중요)
브라우저/레포에 키를 넣지 않습니다. **반드시 Cloudflare Secret**으로 저장합니다.

- `GEMINI_API_KEY`: Gemini API Key

Wrangler 예시:
- `wrangler secret put GEMINI_API_KEY`

## 3) 라우팅: 같은 도메인의 /api/*
권장 방식은 Pages 도메인에 대해 Worker route를 `/api/*`로 연결하는 것입니다.

예:
- `https://your-pages-domain.example.com/api/analyze`
- `https://your-pages-domain.example.com/api/quiz`
- `https://your-pages-domain.example.com/api/tts`

## 4) Cloudflare Access(클로즈드 베타)
클로즈드(팀/지인만) 운영이면 **Pages 전체를 Access로 보호**하는 구성이 가장 단순합니다.

권장:
- Access Application: `https://your-pages-domain.example.com/*`
- Policy: 특정 이메일 allow-list 또는 이메일 도메인 allow-list

동일 도메인에서 `/api/*`도 함께 보호되므로 별도의 CORS 복잡도가 줄어듭니다.


