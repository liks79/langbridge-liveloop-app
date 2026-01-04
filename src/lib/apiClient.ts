import type { Mode } from './detectMode';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchWith429Retry(
  fn: () => Promise<Response>,
  { maxRetries = 2 }: { maxRetries?: number } = {},
): Promise<Response> {
  let attempt = 0;
  // attempt 0 + up to maxRetries additional attempts
  while (true) {
    const res = await fn();
    if (res.status !== 429 || attempt >= maxRetries) return res;
    const waitMs = Math.pow(2, attempt) * 1000; // 1s, 2s
    attempt += 1;
    await sleep(waitMs);
  }
}

export function createApiClient(apiBase: string) {
  const base = (apiBase ?? '').replace(/\/$/, '');

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetchWith429Retry(() =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  }

  async function postBlob(path: string, body: unknown): Promise<Blob> {
    const res = await fetchWith429Retry(() =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    if (!res.ok) throw new Error(String(res.status));
    return await res.blob();
  }

  return {
    analyze(inputText: string, detectedMode: Mode) {
      return postJson('/api/analyze', { inputText, detectedMode });
    },
    quiz(detectedMode: Mode, result: any) {
      return postJson('/api/quiz', { detectedMode, result });
    },
    tts(text: string) {
      return postBlob('/api/tts', { text });
    },
    topic(keyword?: string) {
      return postJson('/api/topic', { keyword });
    },
    dailyExpression() {
      return postJson('/api/daily-expression', {});
    },
    dialogue(text: string) {
      return postJson('/api/dialogue', { text });
    },
  };
}



