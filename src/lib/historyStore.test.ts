import { describe, expect, it, beforeEach } from 'vitest';
import { loadHistory, saveHistory } from './historyStore';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe('historyStore', () => {
  beforeEach(() => {
    // Provide a deterministic localStorage for tests (some runtimes have a partial implementation).
    // @ts-expect-error - test override
    globalThis.localStorage = new MemoryStorage();
  });

  it('returns [] when nothing is stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns [] when stored JSON is invalid', () => {
    localStorage.setItem('english-live-loop-history', '{not valid json');
    expect(loadHistory()).toEqual([]);
  });

  it('roundtrips values', () => {
    const value = [{ id: 1, text: 'hi' }];
    saveHistory(value);
    expect(loadHistory()).toEqual(value);
  });
});


