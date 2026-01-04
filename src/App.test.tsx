import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from './App';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('App Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    
    // Default handler for different endpoints
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/daily-expression')) {
        return {
          ok: true,
          json: async () => ({
            expression: 'break a leg',
            meaningKo: '행운을 빌어',
            date: new Date().toISOString().slice(0, 10),
            category: 'Idioms'
          })
        };
      }
      if (url.includes('/api/topic')) {
        return {
          ok: true,
          json: async () => ({ text: 'The early bird catches the worm' })
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  it('renders correctly initially', async () => {
    render(<App />);
    expect(screen.getByText('LangBridge')).toBeInTheDocument();
    expect(screen.getByTestId('main-input')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/"break a leg"/)).toBeInTheDocument();
    });
  });

  it('detects language and updates UI labels', async () => {
    render(<App />);
    const textarea = screen.getByTestId('main-input');
    
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    await waitFor(() => {
      expect(screen.getByText('English Detected')).toBeInTheDocument();
    });

    fireEvent.change(textarea, { target: { value: '안녕' } });
    await waitFor(() => {
      expect(screen.getByText('한국어 감지됨')).toBeInTheDocument();
    });
  });

  it('shows error notice when API fails with network error', async () => {
    // Suppress console.error for expected API failure
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/analyze')) {
        throw new TypeError('Failed to fetch');
      }
      // Keep other endpoints working
      return { ok: true, json: async () => ({}) };
    });
    
    render(<App />);
    const textarea = screen.getByTestId('main-input');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    
    const analyzeBtn = screen.getByRole('button', { name: /영어 분석하기/ });
    fireEvent.click(analyzeBtn);
    
    await waitFor(() => {
      expect(screen.getByText('연결에 문제가 발생했습니다')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('generates today topic when clicking the button', async () => {
    render(<App />);
    const topicBtn = screen.getByRole('button', { name: /오늘의 토픽/ });
    fireEvent.click(topicBtn);

    await waitFor(() => {
      const textarea = screen.getByTestId('main-input');
      expect(textarea).toHaveValue('The early bird catches the worm');
    });
  });
});
