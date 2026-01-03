# 💬 LangBridge | LiveLoop.App 🌱

**LangBridge**는 AI(Gemini 2.0)를 활용하여 영어 학습을 더 스마트하고 즐겁게 만들어주는 모던 웹 애플리케이션입니다. 분석, 퀴즈, 다이얼로그 생성 등 다양한 학습 기능을 통해 네이티브 수준의 영어를 경험하세요.

![LangBridge Demo](https://via.placeholder.com/800x450?text=LangBridge+Demo+Image) <!-- 추후 실제 스크린샷으로 교체 권장 -->

## ✨ 주요 기능 (Key Features)

- **🔍 영어 분석 (AI Analysis)**: 입력한 문장의 뉘앙스, 문법, 핵심 단어를 AI가 정밀 분석합니다.
- **🎧 쉐도잉 플레이어 (Shadowing Player)**: Gemini TTS를 활용한 고품질 발음 듣기 및 속도 조절 기능.
- **💬 실전 회화 (Context Dialogue)**: 학습한 문장을 바탕으로 Liz와 David의 생생한 대화문을 생성합니다.
- **📚 나만의 단어장 (My Vocabulary)**: 학습 중 발견한 중요한 단어를 저장하고 관리하세요.
- **📝 오늘의 토픽 & 표현 (Daily Insights)**: 매일 새로운 영어 표현과 학습 주제를 추천받습니다.
- **🔥 학습 스트릭 (Study Streak)**: 매일매일 학습 습관을 유지하고 기록하세요.

## 🚀 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend**: Cloudflare Workers (Serverless)
- **AI**: Google Gemini API (Analysis, Quiz, Dialogue, TTS)
- **Icons**: Lucide React
- **Testing**: Vitest, React Testing Library

## 🛠️ 시작하기 (Getting Started)

### 1. 전제 조건 (Prerequisites)
- Node.js (v20 이상 권장)
- [Google AI Studio](https://aistudio.google.com/)에서 발급받은 **Gemini API Key**

### 2. 로컬 개발 환경 설정
```bash
# 저장소 복제
git clone https://github.com/liks79/langbridge-liveloop-app.git
cd langbridge-liveloop-app

# 의존성 설치
npm install

# 환경 변수 설정
cp workers/api/.dev.vars.example workers/api/.dev.vars
# .dev.vars 파일을 열고 GEMINI_API_KEY를 입력하세요.
```

### 3. 실행
```bash
# 프론트엔드 실행
npm run dev

# Worker 로컬 실행 (별도 터미널)
cd workers/api
npx wrangler dev
```

## 🌐 배포 (Deployment)

본 프로젝트는 Cloudflare Pages와 Workers를 통해 통합 배포됩니다.

```bash
# 빌드 및 배포
npm run build
npx wrangler versions upload
```

> **주의**: 배포 후 Cloudflare Dashboard에서 `GEMINI_API_KEY`와 `ALLOWED_ORIGINS` 환경 변수를 반드시 설정해야 합니다.

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.

---

Built with ❤️ by [LiveLoop.App](https://liveloop.app)
