export type Mode = 'EtoK' | 'KtoE';

export function detectMode(inputText: string): Mode {
  if (!inputText.trim()) return 'EtoK';
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(inputText);
  return hasKorean ? 'KtoE' : 'EtoK';
}



