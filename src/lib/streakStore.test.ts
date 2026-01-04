import { describe, expect, it, beforeEach } from 'vitest';
import { loadStreak, saveStreak, bumpStreak } from './streakStore';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

describe('streakStore', () => {
  beforeEach(() => {
    // @ts-expect-error - test override
    globalThis.localStorage = new MemoryStorage();
  });

  it('starts at 0 when nothing is stored', () => {
    expect(loadStreak()).toEqual({ streak: 0, lastStudyDate: '' });
  });

  it('initializes streak to 1 on first study', () => {
    const today = new Date('2026-01-01');
    const state = bumpStreak(today);
    expect(state.streak).toBe(1);
    expect(state.lastStudyDate).toBe('2026-01-01');
  });

  it('idempotent when studying multiple times on the same day', () => {
    const today = new Date('2026-01-01');
    bumpStreak(today);
    const state = bumpStreak(today);
    expect(state.streak).toBe(1);
  });

  it('increments streak on consecutive days', () => {
    const day1 = new Date('2026-01-01');
    const day2 = new Date('2026-01-02');
    bumpStreak(day1);
    const state = bumpStreak(day2);
    expect(state.streak).toBe(2);
    expect(state.lastStudyDate).toBe('2026-01-02');
  });

  it('resets streak to 1 if a day is missed', () => {
    const day1 = new Date('2026-01-01');
    const day3 = new Date('2026-01-03');
    bumpStreak(day1);
    const state = bumpStreak(day3);
    expect(state.streak).toBe(1);
    expect(state.lastStudyDate).toBe('2026-01-03');
  });

  it('survives complex sequence', () => {
    bumpStreak(new Date('2026-01-01'));
    bumpStreak(new Date('2026-01-02'));
    bumpStreak(new Date('2026-01-03'));
    const state = bumpStreak(new Date('2026-01-04'));
    expect(state.streak).toBe(4);
    
    // Miss two days
    const afterGap = bumpStreak(new Date('2026-01-07'));
    expect(afterGap.streak).toBe(1);
  });
});

