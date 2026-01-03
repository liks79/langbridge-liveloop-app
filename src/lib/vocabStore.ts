export type VocabItem = {
  id: string;
  term: string;
  meaning?: string;
  exampleEn?: string;
  exampleKo?: string;
  createdAt: number;
};

const KEY = 'langbridge-vocab-v1';

export function loadVocab(): VocabItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VocabItem[];
  } catch {
    return [];
  }
}

export function saveVocab(items: VocabItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 300)));
}

export function addVocab(item: Omit<VocabItem, 'id' | 'createdAt'>): VocabItem[] {
  const items = loadVocab();
  const term = item.term.trim();
  if (!term) return items;
  const exists = items.some((x) => x.term.toLowerCase() === term.toLowerCase());
  if (exists) return items;

  const next: VocabItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    ...item,
    term,
  };
  const out = [next, ...items];
  saveVocab(out);
  return out;
}

export function removeVocab(id: string): VocabItem[] {
  const items = loadVocab();
  const out = items.filter((x) => x.id !== id);
  saveVocab(out);
  return out;
}

export function clearVocab() {
  saveVocab([]);
}







