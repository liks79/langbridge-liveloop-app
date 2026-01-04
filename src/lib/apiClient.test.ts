import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createApiClient } from './apiClient';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('analyze() posts JSON to /api/analyze', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock as any);

    const api = createApiClient('');
    const res = await api.analyze('hello', 'EtoK');
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ inputText: 'hello', detectedMode: 'EtoK' })
    }));
  });

  it('quiz() posts JSON to /api/quiz', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ quiz: [] }));
    vi.stubGlobal('fetch', fetchMock as any);

    const api = createApiClient('');
    const res = await api.quiz('EtoK', { some: 'result' });
    expect(res).toEqual({ quiz: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/quiz', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ detectedMode: 'EtoK', result: { some: 'result' } })
    }));
  });

  it('tts() posts text to /api/tts', async () => {
    const blob = new Blob(['audio'], { type: 'audio/wav' });
    const fetchMock = vi.fn(async () => new Response(blob, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock as any);

    const api = createApiClient('');
    const res = await api.tts('hello');
    expect(res).toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: 'hello' })
    }));
  });

  it('retries on 429 with exponential backoff (1s, 2s) then succeeds', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', fetchMock as any);

    const api = createApiClient('');
    const promise = api.analyze('hello', 'EtoK');

    // First request happens immediately
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Backoff 1s then retry
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
