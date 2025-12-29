type StreakState = {
  streak: number;
  lastStudyDate: string; // YYYY-MM-DD (local)
};

const KEY = 'langbridge-study-streak-v1';

function localDateISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return localDateISO(dt);
}

export function loadStreak(): StreakState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { streak: 0, lastStudyDate: '' };
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      streak: typeof parsed.streak === 'number' && parsed.streak >= 0 ? parsed.streak : 0,
      lastStudyDate: typeof parsed.lastStudyDate === 'string' ? parsed.lastStudyDate : '',
    };
  } catch {
    return { streak: 0, lastStudyDate: '' };
  }
}

export function saveStreak(state: StreakState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/**
 * Mark "today" as studied and update streak count.
 * - same day: no change
 * - consecutive day: +1
 * - missed day(s): reset to 1
 */
export function bumpStreak(now = new Date()): StreakState {
  const today = localDateISO(now);
  const state = loadStreak();

  if (state.lastStudyDate === today) return state;

  const yesterday = addDays(today, -1);
  const next: StreakState =
    state.lastStudyDate === yesterday
      ? { streak: Math.max(1, state.streak + 1), lastStudyDate: today }
      : { streak: 1, lastStudyDate: today };

  saveStreak(next);
  return next;
}





