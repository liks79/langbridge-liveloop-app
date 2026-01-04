# LangBridge API Worker

이 디렉토리는 LangBridge의 백엔드 로직을 담당하는 Cloudflare Worker 소스 코드를 포함하고 있습니다. 브라우저에서 직접 Gemini API를 호출하지 않고 이 Worker를 거침으로써 **API Key를 안전하게 보호**하고 CORS 및 보안 로직을 중앙에서 관리합니다.

## 🛠️ 통합 설정 (Integrated Configuration)

현재 프로젝트는 **Cloudflare Workers with Assets** 방식을 사용하여 프론트엔드와 백엔드를 통합 배포합니다.

- **`wrangler.toml`**: 프로젝트 루트 디렉토리에 위치하며, Worker의 엔트리 포인트(`workers/api/src/index.ts`)와 정적 자산 경로(`./dist`)를 동시에 정의합니다.
- **중요**: `npx wrangler dev` 명령어가 `wrangler.toml` 파일을 참조해야 하므로, 반드시 **프로젝트 루트(root) 디렉토리**에서 실행해야 합니다.

## 🚀 API 엔드포인트 (Endpoints)

모든 엔드포인트는 `POST` 메서드와 `application/json` 본문을 사용합니다.

- `POST /api/analyze`: 입력된 문장의 뉘앙스 및 키워드 분석
- `POST /api/quiz`: 학습 내용 기반 퀴즈 생성
- `POST /api/tts`: Gemini TTS를 활용한 고품질 음성 생성 (WAV 반환)
- `POST /api/topic`: 오늘의 학습 토픽 생성
- `POST /api/daily-expression`: 오늘의 영어 표현 생성
- `POST /api/dialogue`: 문맥 기반 실전 회화 생성

## 🛡️ 보안 및 환경 변수 (Security & Vars)

### 1. Secrets (보안 정보)
Gemini API Key는 절대 코드에 포함하지 마세요. Cloudflare Dashboard 또는 CLI를 통해 Secret으로 관리합니다.
- `wrangler secret put GEMINI_API_KEY`

### 2. ALLOWED_ORIGINS (CORS 제한)
무분별한 API 호출을 방지하기 위해 허용된 도메인에서만 호출 가능하도록 설정할 수 있습니다.
- **운영 환경**: Cloudflare Dashboard의 **Settings > Variables**에서 `ALLOWED_ORIGINS` 변수를 설정하세요. (예: `https://langbridge.example.com`)
- **로컬 개발**: `workers/api/.dev.vars` 파일에 설정하여 테스트할 수 있습니다. 설정이 비어있으면 모든 오리진을 허용합니다.

## 💻 로컬 개발 (Local Development)

Wrangler 설정 파일이 루트에 있으므로, 반드시 **루트 디렉토리**에서 다음 명령어를 실행하세요:

```bash
# 프로젝트 루트에서 실행
npx wrangler dev
```

Worker는 기본적으로 프론트엔드(`localhost:5173`)의 요청을 수락하며, `.dev.vars` 파일에 있는 환경 변수를 우선적으로 참고합니다.
