import '@testing-library/jest-dom/vitest';

// Ensure `localStorage` is available on `globalThis` in the jsdom test environment.
// (Some environments expose it on `window` only.)
if (typeof window !== 'undefined' && window.localStorage) {
  // @ts-expect-error - make localStorage available globally for app code under test
  globalThis.localStorage = window.localStorage;
}



