import { describe, expect, it } from 'vitest';
import { detectMode } from './detectMode';

describe('detectMode', () => {
  it('defaults to EtoK for empty/whitespace input', () => {
    expect(detectMode('')).toBe('EtoK');
    expect(detectMode('   ')).toBe('EtoK');
  });

  it('detects Korean characters => KtoE', () => {
    expect(detectMode('안녕하세요')).toBe('KtoE');
    expect(detectMode('hello 안녕')).toBe('KtoE');
  });

  it('detects non-Korean => EtoK', () => {
    expect(detectMode('hello world')).toBe('EtoK');
    expect(detectMode('12345')).toBe('EtoK');
    expect(detectMode('!@#$%')).toBe('EtoK');
  });
});







