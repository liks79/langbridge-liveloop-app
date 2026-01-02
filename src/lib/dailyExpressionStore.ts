type DailyExpression = {
  date: string; // YYYY-MM-DD
  expression: string;
  meaningKo?: string;
  exampleEn?: string;
  exampleKo?: string;
};

const KEY = 'langbridge-daily-expression-v1';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function loadDailyExpression(): DailyExpression | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyExpression;
    if (!parsed?.date || !parsed?.expression) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyExpression(value: DailyExpression) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function isDailyExpressionFresh(value: DailyExpression | null) {
  if (!value) return false;
  return value.date === todayISO();
}






