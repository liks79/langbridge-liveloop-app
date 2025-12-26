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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analyze');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ inputText: 'hello', detectedMode: 'EtoK' }));
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

    // First request happens immediately (flush microtasks only)
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Backoff 1s then retry
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});


