type AnalyzeRequest = {
  inputText: string;
  detectedMode: 'EtoK' | 'KtoE';
};

type QuizRequest = {
  detectedMode: 'EtoK' | 'KtoE';
  result: any;
};

type TtsRequest = {
  text: string;
};

type Env = {
  GEMINI_API_KEY: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_TTS_MODEL?: string;
  GEMINI_TTS_VOICE?: string;
};

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function withCors(req: Request, res: Response) {
  // Same-domain is the primary goal. Still, keep permissive CORS for local dev.
  const origin = req.headers.get('Origin') ?? '*';
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcm16ToWavBytes(pcmBytes: Uint8Array, sampleRate: number): Uint8Array {
  // Mono, 16-bit little-endian PCM
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(pcmBytes);
  return new Uint8Array(buffer);
}

async function geminiGenerateContent(env: Env, model: string, payload: unknown, retryCount = 0): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (resp.status === 429 && retryCount < 2) {
    const waitMs = Math.pow(2, retryCount) * 1000;
    await sleep(waitMs);
    return geminiGenerateContent(env, model, payload, retryCount + 1);
  }

  return resp;
}

function buildAnalyzePrompt(detectedMode: 'EtoK' | 'KtoE') {
  return detectedMode === 'EtoK'
    ? `
You are an expert English tutor for Korean students.
Analyze the user's English input.
Return a JSON object with this structure:
{
  "originalText": "The original english text",
  "translation": "Natural Korean translation",
  "nuance": "Brief explanation of the tone or context (in Korean)",
  "keywords": [
    {
      "word": "English Word",
      "meaning": "Korean Meaning",
      "usage": "Example sentence using this word in English",
      "usageTranslation": "Korean translation of the example"
    }
  ]
}
Analyze 3-5 key words.
`.trim()
    : `
You are an expert English writing coach for Korean speakers.
Analyze the user's Korean input and provide English translations.
Return a JSON object with this structure:
{
  "originalText": "The original Korean text",
  "variations": [
    { "style": "Formal (격식)", "text": "English translation" },
    { "style": "Casual (캐주얼)", "text": "English translation" },
    { "style": "Native/Idiomatic (원어민 표현)", "text": "English translation" }
  ],
  "keywords": [
    {
      "word": "Korean Word from input",
      "meaning": "English Equivalent",
      "note": "Brief usage note or nuance explanation in Korean"
    }
  ]
}
Analyze 3-5 key words.
`.trim();
}

function buildQuizPrompt(detectedMode: 'EtoK' | 'KtoE', result: any) {
  const contextText =
    detectedMode === 'EtoK'
      ? `Original Text: ${result.originalText}\nTranslation: ${result.translation}\nKeywords: ${result.keywords?.map((k: any) => k.word).join(', ')}`
      : `Original Korean: ${result.originalText}\nEnglish Translations: ${result.variations?.map((v: any) => v.text).join(', ')}\nKeywords: ${result.keywords?.map((k: any) => k.meaning).join(', ')}`;

  return `
Create a mini-quiz with 3 multiple-choice questions based on the English learning material provided below.

Context Material:
${contextText}

Instructions:
1. Create 3 questions in Korean.
2. Questions should test understanding of English vocabulary meanings, usage, or grammar nuances related to the context.
3. Provide 4 options for each question.
4. Indicate the correct answer index (0-3).
5. Provide a brief explanation for the correct answer.

Return strictly JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text in Korean",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswerIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}
`.trim();
}

async function handleAnalyze(req: Request, env: Env) {
  const body = (await req.json()) as AnalyzeRequest;
  if (!body?.inputText?.trim()) return json({ error: 'inputText is required' }, { status: 400 });
  const detectedMode = body.detectedMode === 'KtoE' ? 'KtoE' : 'EtoK';

  const model = env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash-latest';
  const systemPrompt = buildAnalyzePrompt(detectedMode);

  const resp = await geminiGenerateContent(env, model, {
    contents: [{ parts: [{ text: body.inputText }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: 'application/json' },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return json({ error: 'Gemini error', status: resp.status, detail: text }, { status: resp.status });
  }

  const data: any = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return json({ error: 'No content from Gemini' }, { status: 502 });

  try {
    const parsed = JSON.parse(raw);
    return json(parsed);
  } catch {
    return json({ error: 'Invalid JSON from Gemini', raw }, { status: 502 });
  }
}

async function handleQuiz(req: Request, env: Env) {
  const body = (await req.json()) as QuizRequest;
  if (!body?.result) return json({ error: 'result is required' }, { status: 400 });
  const detectedMode = body.detectedMode === 'KtoE' ? 'KtoE' : 'EtoK';

  const model = env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash-latest';
  const quizPrompt = buildQuizPrompt(detectedMode, body.result);

  const resp = await geminiGenerateContent(env, model, {
    contents: [{ parts: [{ text: 'Generate a quiz based on this context.' }] }],
    systemInstruction: { parts: [{ text: quizPrompt }] },
    generationConfig: { responseMimeType: 'application/json' },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return json({ error: 'Gemini error', status: resp.status, detail: text }, { status: resp.status });
  }

  const data: any = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return json({ error: 'No content from Gemini' }, { status: 502 });

  try {
    const parsed = JSON.parse(raw);
    return json(parsed);
  } catch {
    return json({ error: 'Invalid JSON from Gemini', raw }, { status: 502 });
  }
}

async function handleTts(req: Request, env: Env) {
  const body = (await req.json()) as TtsRequest;
  if (!body?.text?.trim()) return json({ error: 'text is required' }, { status: 400 });

  const model = env.GEMINI_TTS_MODEL || 'gemini-2.0-flash-exp';
  const voice = env.GEMINI_TTS_VOICE || 'Aoede';

  const resp = await geminiGenerateContent(env, model, {
    contents: [{ parts: [{ text: body.text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return json({ error: 'Gemini error', status: resp.status, detail: text }, { status: resp.status });
  }

  const data: any = await resp.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const base64 = inlineData?.data as string | undefined;
  const mimeType = (inlineData?.mimeType as string | undefined) || 'audio/L16; rate=24000';

  if (!base64) return json({ error: 'No audio data from Gemini' }, { status: 502 });

  // Gemini often returns raw PCM: audio/L16; rate=24000
  const rateMatch = mimeType.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

  const pcmBytes = base64ToUint8Array(base64);
  const wavBytes = pcm16ToWavBytes(pcmBytes, sampleRate);

  const headers = new Headers();
  headers.set('Content-Type', 'audio/wav');
  headers.set('Cache-Control', 'private, max-age=86400');
  return new Response(wavBytes, { status: 200, headers });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return withCors(req, new Response(null, { status: 204 }));
    }

    if (!url.pathname.startsWith('/api/')) {
      return withCors(req, json({ error: 'Not found' }, { status: 404 }));
    }

    if (!env.GEMINI_API_KEY) {
      return withCors(req, json({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, { status: 500 }));
    }

    try {
      let res: Response;
      if (req.method === 'POST' && url.pathname === '/api/analyze') res = await handleAnalyze(req, env);
      else if (req.method === 'POST' && url.pathname === '/api/quiz') res = await handleQuiz(req, env);
      else if (req.method === 'POST' && url.pathname === '/api/tts') res = await handleTts(req, env);
      else res = json({ error: 'Not found' }, { status: 404 });

      return withCors(req, res);
    } catch (e: any) {
      return withCors(
        req,
        json({ error: 'Worker error', detail: e?.message || String(e) }, { status: 500 }),
      );
    }
  },
};


