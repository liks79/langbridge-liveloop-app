import { describe, expect, it, beforeEach } from 'vitest';
import { loadVocab, saveVocab, addVocab, removeVocab, clearVocab } from './vocabStore';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

describe('vocabStore', () => {
  beforeEach(() => {
    // @ts-expect-error - test override
    globalThis.localStorage = new MemoryStorage();
  });

  it('starts empty', () => {
    expect(loadVocab()).toEqual([]);
  });

  it('adds a new term', () => {
    const list = addVocab({ term: 'hello', meaning: '안녕' });
    expect(list).toHaveLength(1);
    expect(list[0].term).toBe('hello');
    expect(list[0].id).toBeDefined();
  });

  it('prevents exact duplicates (case-insensitive)', () => {
    addVocab({ term: 'Hello' });
    const list = addVocab({ term: 'hello' });
    expect(list).toHaveLength(1);
  });

  it('removes a term by id', () => {
    const list1 = addVocab({ term: 'one' });
    const id = list1[0].id;
    const list2 = removeVocab(id);
    expect(list2).toHaveLength(0);
  });

  it('clears all terms', () => {
    addVocab({ term: 'a' });
    addVocab({ term: 'b' });
    clearVocab();
    expect(loadVocab()).toHaveLength(0);
  });

  it('limits to 300 items', () => {
    // Mock slice limit check
    const manyItems = Array.from({ length: 350 }, (_, i) => ({
      id: String(i),
      term: `word-${i}`,
      createdAt: Date.now()
    }));
    saveVocab(manyItems);
    expect(loadVocab()).toHaveLength(300);
  });
});

