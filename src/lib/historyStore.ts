const KEY = 'english-live-loop-history';

export function loadHistory<T = any[]>(): T {
  try {
    const saved = localStorage.getItem(KEY);
    return (saved ? JSON.parse(saved) : []) as T;
  } catch {
    return [] as T;
  }
}

export function saveHistory(value: unknown) {
  localStorage.setItem(KEY, JSON.stringify(value));
}



