import { useState, useEffect, useMemo, useCallback } from 'react';
import { createApiClient } from '../lib/apiClient';
import { loadDailyExpression, saveDailyExpression, isDailyExpressionFresh } from '../lib/dailyExpressionStore';
import { loadStreak, bumpStreak } from '../lib/streakStore';
import { loadVocab, addVocab, removeVocab as removeVocabFromStore, clearVocab as clearVocabStore, type VocabItem } from '../lib/vocabStore';
import { loadHistory, saveHistory } from '../lib/historyStore';
import { useAudio } from './useAudio';

export const useAppLogic = () => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const api = useMemo(() => createApiClient(API_BASE), [API_BASE]);

  // States
  const [dailyExpression, setDailyExpression] = useState<any | null>(() => loadDailyExpression());
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [streakState, setStreakState] = useState(() => loadStreak());
  const [vocab, setVocab] = useState<VocabItem[]>(() => loadVocab());
  const [showVocab, setShowVocab] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [topicKeyword, setTopicKeyword] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [showScore, setShowScore] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [dialogue, setDialogue] = useState<any | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState<number | null>(null);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState(false);
  const [isPreparingDialogueAudio, setIsPreparingDialogueAudio] = useState(false);
  const [dialogueAudioLoadedCount, setDialogueAudioLoadedCount] = useState(0);
  const [history, setHistory] = useState<any[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [detectedMode, setDetectedMode] = useState<'EtoK' | 'KtoE'>('EtoK');
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [lastFailedAction, setLastFailedAction] = useState<{ fn: () => void; label: string } | null>(null);

  const handleApiError = useCallback((err: any, retryAction: () => void, label: string, silent = false) => {
    console.error(`API Error [${label}]:`, err);
    const isNetworkError = err instanceof TypeError || err.message?.toLowerCase().includes('fetch');
    
    if (isNetworkError) {
      setIsConnectionError(true);
      setLastFailedAction({ fn: retryAction, label });
    } else if (!silent) {
      setError(`${label} 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`);
    }
  }, []);

  const {
    isSpeaking,
    speakingText,
    ttsSource,
    ttsRate,
    setTtsRate,
    speak,
    getAudioUrl,
    audioRef
  } = useAudio({ apiBase: API_BASE, handleApiError });

  // Persistence
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    if (isDailyExpressionFresh(dailyExpression)) {
      if (dailyExpression?.expression) {
        void getAudioUrl(dailyExpression.expression).catch(() => {});
      }
      return;
    }
    handleRefreshDailyExpression();
  }, [dailyExpression]);

  useEffect(() => {
    if (!inputText.trim()) {
      setDetectedMode('EtoK');
      return;
    }
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(inputText);
    setDetectedMode(hasKorean ? 'KtoE' : 'EtoK');
  }, [inputText]);

  const isDialogueAudioReady = useMemo(() => {
    if (!dialogue?.turns?.length) return false;
    return dialogueAudioLoadedCount === dialogue.turns.length;
  }, [dialogue, dialogueAudioLoadedCount]);

  // Handlers
  const handleRefreshDailyExpression = async () => {
    if (dailyRefreshing) return;
    setDailyRefreshing(true);
    try {
      const data = await api.dailyExpression();
      setDailyExpression(data);
      saveDailyExpression(data);
      if (data?.expression) {
        void getAudioUrl(data.expression).catch(() => {});
      }
    } catch (err) {
      handleApiError(err, handleRefreshDailyExpression, '오늘의 표현 갱신');
    } finally {
      setDailyRefreshing(false);
    }
  };

  const handleGenerateTodayTopic = async () => {
    if (topicLoading) return;
    setTopicLoading(true);
    setError('');
    setResult(null);
    setQuizData(null);
    setUserAnswers({});
    setShowScore(false);

    try {
      const data = await api.topic(topicKeyword.trim() || undefined);
      const text = (data?.text as string | undefined) ?? '';
      if (!text.trim()) throw new Error('Empty topic');

      setInputText(text);
      void getAudioUrl(text).catch(() => {});
      setStreakState(bumpStreak());
      window.setTimeout(() => {
        try {
          document.querySelector('textarea')?.focus();
        } catch { /* ignore */ }
      }, 0);
    } catch (err) {
      handleApiError(err, handleGenerateTodayTopic, '토픽 생성');
    } finally {
      setTopicLoading(false);
    }
  };

  const handleAnalyze = async (retryCount = 0, textOverride?: string) => {
    const textToAnalyze = (textOverride ?? inputText).trim();
    if (!textToAnalyze) return;
    setLoading(true);
    setError('');
    if (retryCount === 0) {
      setResult(null);
      setQuizData(null); 
      setUserAnswers({});
      setShowScore(false);
    }

    try {
      const computedMode: 'EtoK' | 'KtoE' = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(textToAnalyze) ? 'KtoE' : 'EtoK';
      const parsedContent = await api.analyze(textToAnalyze, computedMode);
      
      setResult(parsedContent);
      setStreakState(bumpStreak());

      if (computedMode === 'EtoK') {
        void getAudioUrl(textToAnalyze).catch(() => {});
      } else if (computedMode === 'KtoE' && parsedContent?.variations) {
        parsedContent.variations.forEach((v: any) => {
          if (v.text) void getAudioUrl(v.text).catch(() => {});
        });
      }

      const dialogueSourceText = computedMode === 'EtoK' 
        ? textToAnalyze 
        : (parsedContent.variations?.[0]?.text || textToAnalyze);
      
      if (dialogueSourceText) {
        void handleGenerateDialogue(dialogueSourceText).catch(() => {});
      }

      const newItem = {
        id: Date.now(),
        text: textToAnalyze,
        mode: computedMode,
        result: parsedContent,
        timestamp: new Date().toLocaleString()
      };
      
      setHistory(prev => {
        const newHistory = [newItem, ...prev];
        return newHistory.slice(0, 100);
      });

    } catch (err) {
      if (err instanceof Error && err.message === '429' && retryCount < 2) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return handleAnalyze(retryCount + 1, textToAnalyze);
      }
      handleApiError(err, () => handleAnalyze(retryCount, textOverride), '학습 결과 분석');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: any) => {
    setInputText(item.text);
    setDetectedMode(item.mode);
    setResult(item.result);
    setQuizData(null);
    setUserAnswers({});
    setShowScore(false);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (window.confirm('모든 기록을 삭제하시겠습니까?')) {
      setHistory([]);
    }
  };

  const saveToVocab = (item: any) => {
    try {
      const next = addVocab(item);
      setVocab(next);
    } catch { /* ignore */ }
  };

  const handleGenerateQuiz = async () => {
    if (!result) return;
    setQuizLoading(true);
    setError('');

    try {
      const parsedQuiz = await api.quiz(detectedMode, result);
      setQuizData(parsedQuiz);
    } catch (err) {
      handleApiError(err, handleGenerateQuiz, '퀴즈 생성');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateDialogue = async (textOverride?: string) => {
    const contextText = (textOverride ?? inputText).trim();
    if (!contextText) return;
    if (dialogueLoading) return;
    setDialogueLoading(true);
    setDialogue(null);
    setError('');
    try {
      const parsed = await api.dialogue(contextText);
      setDialogue(parsed);
      setDialogueAudioLoadedCount(0);
    } catch (err) {
      handleApiError(err, () => handleGenerateDialogue(textOverride), '대화 생성', true);
    } finally {
      setDialogueLoading(false);
    }
  };

  const handlePrepareDialogue = async () => {
    if (!dialogue?.turns?.length || isPreparingDialogueAudio || isDialogueAudioReady) return;
    setIsPreparingDialogueAudio(true);
    setDialogueAudioLoadedCount(0);
    try {
      let count = 0;
      for (const t of dialogue.turns) {
        const voice = t.speaker === 'Liz' ? 'WOMAN' : 'MAN';
        try {
          await getAudioUrl(t.en, voice);
          count++;
          setDialogueAudioLoadedCount(count);
        } catch (err) {
          console.warn('Dialogue audio preparation failed for a turn:', err);
          count++;
          setDialogueAudioLoadedCount(count);
        }
      }
    } finally {
      setIsPreparingDialogueAudio(false);
    }
  };

  const handlePlayFullDialogue = async () => {
    if (!dialogue?.turns?.length || isPlayingFullDialogue || !isDialogueAudioReady) return;
    setIsPlayingFullDialogue(true);
    try {
      for (let i = 0; i < dialogue.turns.length; i++) {
        setCurrentDialogueIndex(i);
        const turn = dialogue.turns[i];
        const voice = turn.speaker === 'Liz' ? 'WOMAN' : 'MAN';
        await speak(turn.en, voice);
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.error('Full dialogue playback error:', err);
    } finally {
      setIsPlayingFullDialogue(false);
      setCurrentDialogueIndex(null);
    }
  };

  const handleQuizAnswer = (questionId: number, optionIndex: number) => {
    if (showScore) return; 
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const playSuccessJingle = async () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.75);
      master.connect(ctx.destination);
      const now = ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0.0, d: 0.14 }, { f: 659.25, t: 0.14, d: 0.14 },
        { f: 783.99, t: 0.28, d: 0.14 }, { f: 1046.5, t: 0.42, d: 0.22 },
      ];
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        g.gain.setValueAtTime(0.0001, now + n.t);
        g.gain.exponentialRampToValueAtTime(0.9, now + n.t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
        osc.connect(g);
        g.connect(master);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
      }
      window.setTimeout(() => { try { ctx.close(); } catch {} }, 1000);
    } catch { /* ignore */ }
  };

  const triggerCelebration = async () => {
    setCelebrationKey(Date.now());
    setShowCelebration(true);
    await playSuccessJingle();
    window.setTimeout(() => setShowCelebration(false), 5200);
  };

  const handleSubmitQuiz = async () => {
    setShowScore(true);
    const correct = quizData.questions.filter((q: any) => userAnswers[q.id] === q.correctAnswerIndex).length;
    if (correct === quizData.questions.length) {
      await triggerCelebration();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleReset = () => {
    setInputText('');
    setResult(null);
    setError('');
    setQuizData(null);
    setUserAnswers({});
    setShowScore(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Note: audio state is managed by useAudio hook, but we can't directly reset it here 
    // without exposing a reset function from useAudio if needed. 
    // For now, pausing the ref is enough.
  };

  return {
    dailyExpression, dailyRefreshing, streakState, vocab, setVocab, showVocab, setShowVocab,
    inputText, setInputText, loading, result, error, copiedIndex, topicKeyword, setTopicKeyword,
    topicLoading, quizData, quizLoading, userAnswers, showScore, celebrationKey, showCelebration,
    dialogue, dialogueLoading, currentDialogueIndex, isPlayingFullDialogue, isPreparingDialogueAudio,
    dialogueAudioLoadedCount, history, showHistory, setShowHistory, detectedMode, isConnectionError,
    setIsConnectionError, lastFailedAction, isDialogueAudioReady,
    speak, getAudioUrl, ttsSource, ttsRate, setTtsRate, isSpeaking, speakingText,
    handleRefreshDailyExpression, handleGenerateTodayTopic, handleAnalyze, loadHistoryItem,
    clearHistory, saveToVocab, handleGenerateQuiz, handlePrepareDialogue, handlePlayFullDialogue,
    handleQuizAnswer, handleSubmitQuiz, copyToClipboard, handleReset,
    removeVocab: removeVocabFromStore, clearVocab: clearVocabStore
  };
};

