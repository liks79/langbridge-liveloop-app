import { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, Sparkles, GraduationCap, Copy, Check, RotateCcw, Search, Volume2, Globe, Loader2, HelpCircle, CheckCircle2, XCircle, Trophy, History, X, Trash2, Clock, Flame, Star, Calendar, RefreshCw, WifiOff } from 'lucide-react';
import { loadDailyExpression, saveDailyExpression, isDailyExpressionFresh } from './lib/dailyExpressionStore';
import { loadStreak, bumpStreak } from './lib/streakStore';
import { loadVocab, addVocab, removeVocab, clearVocab, type VocabItem } from './lib/vocabStore';

const App = () => {
  // API base:
  // - Production: keep empty -> same-origin calls to `/api/*` via Worker Route on `langbridge.liveloop.app`
  // - Preview/dev: set `VITE_API_BASE_URL` (e.g. https://<worker>.workers.dev) to avoid domain mismatch
  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

  // Daily Expression (NEW)
  const [dailyExpression, setDailyExpression] = useState<any | null>(() => loadDailyExpression());
  const [dailyRefreshing, setDailyRefreshing] = useState(false);

  // Study Streak (NEW)
  const [streakState, setStreakState] = useState(() => loadStreak());

  // My Vocabulary (NEW)
  const [vocab, setVocab] = useState<VocabItem[]>(() => loadVocab());
  const [showVocab, setShowVocab] = useState(false);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Today Topic (NEW)
  const [topicKeyword, setTopicKeyword] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  
  // Quiz States
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({});
  const [showScore, setShowScore] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Context Dialogue (NEW)
  const [dialogue, setDialogue] = useState<any | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState<number | null>(null);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState(false);
  const [isPreparingDialogueAudio, setIsPreparingDialogueAudio] = useState(false);
  const [dialogueAudioLoadedCount, setDialogueAudioLoadedCount] = useState(0);

  // 대화 음성 준비 완료 여부 계산
  const isDialogueAudioReady = useMemo(() => {
    if (!dialogue?.turns?.length) return false;
    return dialogueAudioLoadedCount === dialogue.turns.length;
  }, [dialogue, dialogueAudioLoadedCount]);

  // 대화 음성 미리 가져오기 함수
  const handlePrepareDialogue = async () => {
    if (!dialogue?.turns?.length || isPreparingDialogueAudio || isDialogueAudioReady) return;
    
    setIsPreparingDialogueAudio(true);
    setDialogueAudioLoadedCount(0);
    
    try {
      let count = 0;
      for (const t of dialogue.turns) {
        const voice = t.speaker === 'Liz' ? 'WOMAN' : 'MAN';
        try {
          // getAudioUrl은 전역 큐를 사용하므로 안전하게 순차 로딩됨
          await getAudioUrl(t.en, voice);
          count++;
          setDialogueAudioLoadedCount(count);
        } catch (err) {
          console.warn('Dialogue audio preparation failed for a turn:', err);
          // 실패하더라도 다음 문장 진행
          count++;
          setDialogueAudioLoadedCount(count);
        }
      }
    } finally {
      setIsPreparingDialogueAudio(false);
    }
  };

  // History States (NEW)
  const [history, setHistory] = useState<any[]>(() => {
    // 초기 로드 시 localStorage에서 히스토리 불러오기
    try {
      const saved = localStorage.getItem('english-live-loop-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // 감지된 모드 상태 ('EtoK': 영어->한국어, 'KtoE': 한국어->영어)
  const [detectedMode, setDetectedMode] = useState<'EtoK' | 'KtoE'>('EtoK');
  
  // 오디오 상태 관리
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [ttsSource, setTtsSource] = useState<'gemini' | 'browser' | null>(null);
  const [ttsRate, setTtsRate] = useState<0.75 | 1.0>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 오디오 캐시 저장소 (Key: 텍스트, Value: Blob URL)
  const audioCache = useRef<Map<string, string>>(new Map());

  // 현재 진행 중인 API 요청 추적 (중복 방지용)
  const inFlightRequests = useRef<Map<string, Promise<string>>>(new Map());

  // 전역 TTS 요청 큐 (Rate Limit 429 방지용)
  const ttsQueueRef = useRef<Promise<any>>(Promise.resolve());
  const lastTtsTimestamp = useRef<number>(0);

  // API 연결 상태 관리
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [lastFailedAction, setLastFailedAction] = useState<{ fn: () => void; label: string } | null>(null);

  // 연결 오류 처리 핸들러
  const handleApiError = (err: any, retryAction: () => void, label: string, silent = false) => {
    console.error(`API Error [${label}]:`, err);
    const isNetworkError = err instanceof TypeError || err.message?.toLowerCase().includes('fetch');
    
    if (isNetworkError) {
      setIsConnectionError(true);
      setLastFailedAction({ fn: retryAction, label });
    } else if (!silent) {
      setError(`${label} 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`);
    }
  };

  // 오디오 URL 가져오기 (Worker `/api/tts` 사용)
  const getAudioUrl = async (text: string, voice?: string, retryCount = 0): Promise<string> => {
    const cleanedText = text.trim();
    if (!cleanedText) return '';

    const cacheKey = voice ? `${voice}:${cleanedText}` : cleanedText;

    // 1. 캐시 확인
    if (audioCache.current.has(cacheKey)) {
      return audioCache.current.get(cacheKey)!;
    }

    // 2. 이미 동일한 텍스트로 요청이 진행 중인지 확인
    if (inFlightRequests.current.has(cacheKey)) {
      return inFlightRequests.current.get(cacheKey)!;
    }

    // 전역 큐를 사용하여 순차적으로 실행
    const fetchWithQueue = async (): Promise<string> => {
      // 큐 대기
      await ttsQueueRef.current;

      try {
        // 강제 Cooldown: 이전 요청으로부터 최소 1초 대기
        const now = Date.now();
        const timeSinceLast = now - lastTtsTimestamp.current;
        const minWait = 1000; 
        if (timeSinceLast < minWait) {
          await new Promise(r => setTimeout(r, minWait - timeSinceLast));
        }

        const response = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanedText, voice }),
        }).catch(err => {
          handleApiError(err, () => getAudioUrl(text, voice), '음성 생성', true);
          throw err;
        });

        lastTtsTimestamp.current = Date.now();

        // 429 오류 처리: 긴급 정지 모드 (5초 대기)
        if (response.status === 429) {
          console.warn('TTS Rate Limit (429) hit. Entering Panic Mode (5s delay).');
          await new Promise(r => setTimeout(r, 5000));
          
          if (retryCount < 2) {
            return getAudioUrl(cleanedText, voice, retryCount + 1);
          }
          throw new Error('Rate limit exceeded after retries');
        }

        if (!response.ok) throw new Error('TTS API Error: ' + response.status);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioCache.current.set(cacheKey, audioUrl);
        return audioUrl;
      } finally {
        inFlightRequests.current.delete(cacheKey);
      }
    };

    // 새로운 요청을 큐에 등록
    const nextTask = fetchWithQueue();
    ttsQueueRef.current = nextTask.catch(() => {}); // 오류가 나도 다음 큐는 진행
    inFlightRequests.current.set(cacheKey, nextTask);
    
    return nextTask;
  };
  // NOTE:
  // - Gemini API 호출은 브라우저에서 직접 하지 않고, 같은 도메인의 Worker(`/api/*`)로만 호출합니다.
  // - API Key는 Worker의 Cloudflare Secret로만 보관되어 브라우저/레포에 노출되지 않습니다.

  // 히스토리 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('english-live-loop-history', JSON.stringify(history));
  }, [history]);

  const handleRefreshDailyExpression = async () => {
    if (dailyRefreshing) return;
    setDailyRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/api/daily-expression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Daily expression refresh failed: ${response.status}`);
      const data = await response.json();
      setDailyExpression(data);
      saveDailyExpression(data);

      // Pre-fetch TTS for the daily expression
      if (data?.expression) {
        void getAudioUrl(data.expression).catch(() => {});
      }
    } catch (err) {
      handleApiError(err, handleRefreshDailyExpression, '오늘의 표현 갱신');
    } finally {
      setDailyRefreshing(false);
    }
  };

  // Daily Expression: load once per day (cached)
  useEffect(() => {
    if (isDailyExpressionFresh(dailyExpression)) {
      // Even if fresh from cache, pre-fetch if expression exists
      if (dailyExpression?.expression) {
        void getAudioUrl(dailyExpression.expression).catch(() => {});
      }
      return;
    }
    handleRefreshDailyExpression();
  }, [API_BASE, dailyExpression]);

  // 1. 언어 자동 감지 로직
  useEffect(() => {
    if (!inputText.trim()) {
      setDetectedMode('EtoK');
      return;
    }
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(inputText);
    setDetectedMode(hasKorean ? 'KtoE' : 'EtoK');
  }, [inputText]);

  // TTS 재생 함수
  const speak = async (text: string, voice?: string): Promise<void> => {
    if (!text) return;
    
    if (isSpeaking && speakingText === text) return;

    // 기존 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // 브라우저 TTS 정지
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    return new Promise((resolve) => {
      // 한글이 포함된 경우 브라우저 TTS 사용 (AI TTS는 영문 최적화 및 오류 방지)
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
        if (window.speechSynthesis) {
          setIsSpeaking(true);
          setSpeakingText(text);
          setTtsSource('browser');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'ko-KR'; // 한국어 설정
          utterance.rate = ttsRate;
          utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingText(null);
            setTtsSource(null);
            resolve();
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            setSpeakingText(null);
            setTtsSource(null);
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        } else {
          resolve();
        }
        return;
      }

      // 영어인 경우 AI TTS 시도
      setIsSpeaking(true);
      setSpeakingText(text);
      setTtsSource('gemini');

      const cleanup = () => {
        setIsSpeaking(false);
        setSpeakingText(null);
        setTtsSource(null);
        resolve();
      };

      getAudioUrl(text, voice)
        .then((audioUrl) => {
          const audio = new Audio(audioUrl);
          audio.playbackRate = ttsRate;
          audioRef.current = audio;
          audio.onended = cleanup;
          audio.onerror = cleanup;
          return audio.play();
        })
        .catch((err) => {
          // 오류 발생 시 경고 로그만 남기고 브라우저 TTS로 폴백
          console.warn('AI TTS Failed, falling back to browser TTS', err);
          setTtsSource('browser');

          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = ttsRate;
            utterance.onend = cleanup;
            utterance.onerror = cleanup;
            window.speechSynthesis.speak(utterance);
          } else {
            cleanup();
          }
        });
    });
  };

  const handleGenerateTodayTopic = async () => {
    if (topicLoading) return;
    setTopicLoading(true);
    setError('');

    // Starting a new study item -> clear previous result/quiz UI.
    setResult(null);
    setQuizData(null);
    setUserAnswers({});
    setShowScore(false);

    try {
      const response = await fetch(`${API_BASE}/api/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: topicKeyword.trim() || undefined }),
      });

      if (!response.ok) throw new Error(`Topic 생성 실패: ${response.status}`);
      const data = await response.json();
      const text = (data?.text as string | undefined) ?? '';
      if (!text.trim()) throw new Error('Empty topic');

      setInputText(text);
      // Pre-fetch TTS for the generated topic (it's English)
      void getAudioUrl(text).catch(() => {});
      // Count this as a study action (generating study text).
      setStreakState(bumpStreak());
      window.setTimeout(() => {
        try {
          document.querySelector('textarea')?.focus();
        } catch {
          // ignore
        }
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
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: textToAnalyze,
          detectedMode: computedMode,
        }),
      });

      // 429 오류 처리 (Too Many Requests)
      if (response.status === 429 && retryCount < 2) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return handleAnalyze(retryCount + 1, textToAnalyze);
      }

      if (!response.ok) throw new Error(`AI 응답 실패: ${response.status}`);

      const parsedContent = await response.json();
      setResult(parsedContent);
      // Count successful analysis as a study day.
      setStreakState(bumpStreak());

      // Pre-fetch TTS if input is English (fire and forget)
      if (computedMode === 'EtoK') {
        void getAudioUrl(textToAnalyze).catch(() => {});
      } else if (computedMode === 'KtoE' && parsedContent?.variations) {
        // Pre-fetch result variations if input was Korean
        parsedContent.variations.forEach((v: any) => {
          if (v.text) void getAudioUrl(v.text).catch(() => {});
        });
      }

      // Automatically generate Context Dialogue after analysis (based on the English text)
      // For EtoK, it's textToAnalyze. For KtoE, use the first suggestion if available.
      const dialogueSourceText = computedMode === 'EtoK' 
        ? textToAnalyze 
        : (parsedContent.variations?.[0]?.text || textToAnalyze);
      
      if (dialogueSourceText) {
        void handleGenerateDialogue(dialogueSourceText).catch(() => {});
      }

      // 히스토리 추가 (최신 100개 유지)
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
      handleApiError(err, () => handleAnalyze(retryCount, textOverride), '학습 결과 분석');
    } finally {
      setLoading(false);
    }
  };

  // 히스토리 복원 함수
  const loadHistoryItem = (item: any) => {
    // 1. 상태 복원
    setInputText(item.text);
    setDetectedMode(item.mode);
    setResult(item.result); // 이로 인해 useEffect가 트리거되고 오디오 프리패치/재생 시도함
    
    // 2. 퀴즈 등 부가 상태 초기화
    setQuizData(null);
    setUserAnswers({});
    setShowScore(false);
    
    // 3. UI 처리
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (window.confirm('모든 기록을 삭제하시겠습니까?')) {
      setHistory([]);
    }
  };

  const saveToVocab = (item: { term: string; meaning?: string; exampleEn?: string; exampleKo?: string }) => {
    try {
      const next = addVocab(item);
      setVocab(next);
    } catch {
      // ignore
    }
  };

  // 퀴즈 생성 함수
  const handleGenerateQuiz = async () => {
    if (!result) return;
    setQuizLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectedMode,
          result,
        }),
      });

      if (!response.ok) throw new Error('퀴즈 생성 실패');

      const parsedQuiz = await response.json();
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
    setDialogue(null); // Clear previous dialogue
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contextText }),
      });
      if (!response.ok) throw new Error('Dialogue 생성 실패');
      const parsed = await response.json();
      setDialogue(parsed);
      
      // [수정] 대화가 생성되어도 음성을 즉시 사전 로딩(prefetch)하지 않습니다.
      // 대신 "전체 대화 듣기" 클릭 시점에 순차적으로 로딩 및 재생합니다.
      setDialogueAudioLoadedCount(0);
    } catch (err) {
      handleApiError(err, () => handleGenerateDialogue(textOverride), '대화 생성', true);
    } finally {
      setDialogueLoading(false);
    }
  };

  const handlePlayFullDialogue = async () => {
    // [수정] 모든 음성이 준비된 상태에서만 재생 가능하게 합니다.
    if (!dialogue?.turns?.length || isPlayingFullDialogue || !isDialogueAudioReady) return;
    
    setIsPlayingFullDialogue(true);
    try {
      for (let i = 0; i < dialogue.turns.length; i++) {
        setCurrentDialogueIndex(i);
        const turn = dialogue.turns[i];
        const voice = turn.speaker === 'Liz' ? 'WOMAN' : 'MAN';
        
        // 이미 캐시되어 있으므로 즉시 재생됩니다.
        await speak(turn.en, voice);
        
        // 화자 간 짧은 휴식
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
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const calculateScore = () => {
    if (!quizData) return 0;
    let correct = 0;
    quizData.questions.forEach((q: any) => {
      if (userAnswers[q.id] === q.correctAnswerIndex) correct++;
    });
    return correct;
  };

  const totalQuestions = quizData?.questions?.length ?? 0;
  const isPerfectScore = useMemo(() => {
    if (!quizData) return false;
    if (totalQuestions <= 0) return false;
    return calculateScore() === totalQuestions;
  }, [quizData, totalQuestions, userAnswers]);

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
        { f: 523.25, t: 0.0, d: 0.14 }, // C5
        { f: 659.25, t: 0.14, d: 0.14 }, // E5
        { f: 783.99, t: 0.28, d: 0.14 }, // G5
        { f: 1046.5, t: 0.42, d: 0.22 }, // C6
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

      window.setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 1000);
    } catch {
      // ignore
    }
  };

  const triggerCelebration = async () => {
    setCelebrationKey(Date.now());
    setShowCelebration(true);
    await playSuccessJingle();
    window.setTimeout(() => setShowCelebration(false), 5200);
  };

  const handleSubmitQuiz = async () => {
    setShowScore(true);
    if (quizData && isPerfectScore) {
      await triggerCelebration();
    }
  };

  const BalloonsOverlay = ({ seed }: { seed: number }) => {
    const balloons = useMemo(() => {
      const colors = ['#7c3aed', '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
      const count = 14;
      return Array.from({ length: count }).map((_, i) => {
        const left = ((seed + i * 47) % 100) * 1.0; // deterministic-ish
        const size = 34 + ((seed + i * 31) % 26); // 34..59
        const delay = (i % 6) * 0.18;
        const float = 4.2 + (i % 5) * 0.35;
        const sway = 1.9 + (i % 4) * 0.35;
        const color = colors[(seed + i) % colors.length];
        return { id: `${seed}-${i}`, left, size, delay, float, sway, color };
      });
    }, [seed]);

    return (
      <div className="lb-celebration-root" aria-hidden="true">
        {balloons.map((b) => (
          <div
            key={b.id}
            className="lb-balloon"
            style={{
              left: `${b.left}%`,
              ['--lb-size' as any]: `${b.size}px`,
              ['--lb-delay' as any]: `${b.delay}s`,
              ['--lb-float' as any]: `${b.float}s`,
              ['--lb-sway' as any]: `${b.sway}s`,
              ['--lb-color' as any]: b.color,
            }}
          >
            <div className="lb-balloon-string" />
          </div>
        ))}

        <div className="absolute inset-x-0 top-6 flex justify-center">
          <div className="bg-white/85 backdrop-blur-md border border-indigo-100 shadow-lg rounded-full px-4 py-2 text-sm font-bold text-indigo-700">
            Perfect score! 🎉
          </div>
        </div>
      </div>
    );
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
    setIsSpeaking(false);
    setSpeakingText(null);
    setTtsSource(null);
    // 캐시 클리어는 리셋 시 하지 않고 유지하여 히스토리 복원 시 활용
    // audioCache.current.clear(); 
  };

  // ClickableEnglish Component
  const ClickableEnglish = ({ text, className = "" }: { text: string, className?: string }) => {
    if (!text) return null;
    
    const words = text.split(/(\s+)/); 

  return (
      <div className={`flex flex-wrap items-center gap-y-1 ${className}`}>
        {words.map((segment, idx) => {
          const isWord = segment.trim().length > 0;
          const isCurrentWord = speakingText === segment;
          
          return isWord ? (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                speak(segment);
              }}
              className={`cursor-pointer rounded px-0.5 transition-all duration-200 select-none ${
                isCurrentWord 
                  ? 'bg-indigo-100 text-indigo-700 font-bold' 
                  : 'hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'
              }`}
              title="Click to listen"
            >
              {segment}
            </span>
          ) : (
            <span key={idx}>{segment}</span>
          );
        })}
        <button
          onClick={(e) => {
            e.stopPropagation();
            speak(text);
          }}
          disabled={isSpeaking && speakingText === text}
          className={`ml-2 p-1.5 rounded-full transition-all flex items-center justify-center ${
            isSpeaking && speakingText === text
              ? 'bg-indigo-100 text-indigo-600'
              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          title="Listen to full sentence"
        >
          {isSpeaking && speakingText === text ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Volume2 size={16} />
          )}
        </button>
        {isSpeaking && speakingText === text && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1.5 animate-pulse shadow-sm border ${
            ttsSource === 'gemini' 
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {ttsSource === 'gemini' ? 'Gemini' : 'Browser'}
          </span>
        )}
      </div>
    );
  };

  const dialogueLoadingProgress = dialogue?.turns?.length > 0 
    ? Math.round((dialogueAudioLoadedCount / dialogue.turns.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      {/* History Sidebar/Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-2 font-bold">
                <History className="w-5 h-5" />
                학습 기록 (최근 {history.length}개)
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>아직 기록이 없습니다.</p>
                  <p className="text-sm">학습을 시작하면 자동으로 저장됩니다.</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        item.mode === 'EtoK' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.mode === 'EtoK' ? 'ENG' : 'KOR'}
                      </span>
                      <span className="text-xs text-slate-400">{item.timestamp?.split(' ')[1] || 'Today'}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-1 group-hover:text-indigo-700">
                      {item.text}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">
                       {item.mode === 'EtoK' ? item.result.translation : item.result.variations?.[0]?.text}
                    </p>
                  </button>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={clearHistory}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 기록 전체 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vocabulary Sidebar/Overlay (NEW) */}
      {showVocab && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowVocab(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
              <div className="flex items-center gap-2 font-bold">
                <Star className="w-5 h-5 fill-current" />
                나만의 단어장 (최근 {vocab.length}개)
              </div>
              <button onClick={() => setShowVocab(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-amber-50/40">
              {vocab.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50 text-amber-400" />
                  <p>아직 저장된 단어가 없습니다.</p>
                  <p className="text-sm text-slate-500">키워드 카드에서 저장해 보세요.</p>
                </div>
              ) : (
                vocab.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm hover:border-amber-200 transition-all group/vitem">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate group-hover/vitem:text-amber-600 transition-colors">{item.term}</div>
                        {item.meaning && <div className="text-sm text-slate-600 mt-0.5">{item.meaning}</div>}
                        {item.exampleEn && (
                          <div className="text-xs text-slate-500 mt-2 italic">"{item.exampleEn}"</div>
                        )}
                      </div>
                      <button
                        onClick={() => setVocab(removeVocab(item.id))}
                        className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {vocab.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => {
                    if (window.confirm('단어장을 모두 비울까요?')) {
                      clearVocab();
                      setVocab([]);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 단어장 전체 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Connection Error Notice */}
      {isConnectionError && (
        <div className="lb-error-notice px-4 py-3 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-[90vw]">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-bold">연결에 문제가 발생했습니다</p>
            <p className="text-red-100 text-xs truncate">네트워크 상태를 확인하고 다시 시도해주세요.</p>
          </div>
          <button 
            onClick={() => {
              setIsConnectionError(false);
              // Small delay to allow the state to reset and potentially re-trigger if it fails again
              setTimeout(() => {
                lastFailedAction?.fn();
              }, 100);
            }}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors"
            title="다시 시도"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsConnectionError(false)}
            className="p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              LangBridge
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">
                {inputText.trim() 
                  ? (detectedMode === 'EtoK' ? 'English Detected' : '한국어 감지됨')
                  : 'Auto Detect'}
              </span>
              <span className="sm:hidden">
                {inputText.trim() 
                  ? (detectedMode === 'EtoK' ? 'ENG' : 'KOR')
                  : 'Auto'}
              </span>
            </div>
            <button
              onClick={() => setShowVocab(true)}
              className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors relative"
              title="나만의 단어장"
            >
              <Star className="w-5 h-5" />
              {vocab.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full px-1.5 py-0.5 shadow">
                  {vocab.length > 99 ? '99+' : vocab.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Streak</span>
              <span>{streakState.streak}d</span>
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative"
              title="학습 기록 보기"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Daily Expression (NEW) */}
        {!dailyExpression && dailyRefreshing ? (
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-500 rounded-3xl p-8 text-white shadow-xl overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center">
                <div className="w-24 h-3 lb-skeleton rounded opacity-50" />
                <div className="w-16 h-4 lb-skeleton rounded opacity-30" />
              </div>
              <div className="space-y-3">
                <div className="w-full max-w-[300px] h-10 lb-skeleton rounded" />
                <div className="w-48 h-6 lb-skeleton rounded opacity-70" />
              </div>
              <div className="pt-2 flex gap-3">
                <div className="w-32 h-10 lb-skeleton rounded opacity-40" />
                <div className="w-32 h-10 lb-skeleton rounded opacity-40" />
              </div>
            </div>
          </div>
        ) : dailyExpression?.expression ? (
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-500 rounded-3xl p-8 text-white shadow-xl overflow-hidden group">
            {/* Faint stylized background icon */}
            <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110">
              <Calendar size={200} strokeWidth={1.5} />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-100/80 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Sparkles className="w-3.5 h-3.5" />
                  TODAY'S IDIOM
                </div>
                {dailyExpression.category && (
                  <div className="px-2 py-0.5 bg-indigo-900/40 border border-indigo-300/30 rounded-md text-[9px] font-black text-amber-300 uppercase tracking-wider shadow-sm">
                    {dailyExpression.category}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight drop-shadow-sm">
                  "{dailyExpression.expression}"
                </h2>
                {dailyExpression.meaningKo && (
                  <p className="mt-2 text-indigo-50 font-bold text-lg opacity-90 drop-shadow-sm">
                    {dailyExpression.meaningKo}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const expr = String(dailyExpression.expression || '').trim();
                    if (!expr) return;
                    setInputText(expr);
                    // Trigger analysis using the explicit text (avoids state timing issues).
                    void handleAnalyze(0, expr);
                  }}
                  disabled={loading || dailyRefreshing}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm shadow-lg transition-all ${
                    loading || dailyRefreshing
                      ? 'bg-white/20 text-white/40 cursor-not-allowed'
                      : 'bg-white/20 text-white border border-white/10 hover:bg-white/30 active:scale-[0.98]'
                  }`}
                  title="이 표현을 입력창에 넣고 바로 분석합니다"
                >
                  이 표현 학습하기
                </button>

                <button
                  onClick={handleRefreshDailyExpression}
                  disabled={loading || dailyRefreshing}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm shadow-lg transition-all ${
                    loading || dailyRefreshing
                      ? 'bg-white/20 text-white/40 cursor-not-allowed'
                      : 'bg-white/20 text-white border border-white/10 hover:bg-white/30 active:scale-[0.98]'
                  }`}
                  title="새로운 표현을 불러옵니다"
                >
                  <RefreshCw className={`w-4 h-4 ${dailyRefreshing ? 'animate-spin' : ''}`} />
                  NEXT
                </button>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${inputText ? 'text-indigo-500' : 'text-slate-400'}`} />
              {inputText.trim() 
                ? (detectedMode === 'EtoK' ? '분석할 영어 문장' : '영작할 한국어 문장')
                : '학습할 문장을 입력하세요 (한/영 자동 감지)'}
            </label>
            {inputText && (
              <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> 초기화
              </button>
            )}
          </div>
          
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="영어 문장을 입력하면 해석해주고, 한국어 문장을 입력하면 영어로 바꿔줍니다."
              className="w-full h-40 p-4 resize-none focus:outline-none text-lg text-slate-700 placeholder:text-slate-300 bg-transparent"
              spellCheck={false}
            />
            
            <div className="absolute bottom-4 right-4 pointer-events-none transition-opacity duration-300">
               {inputText.trim() && (
                 <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm border ${
                   detectedMode === 'EtoK' 
                     ? 'bg-blue-50 text-blue-600 border-blue-100' 
                     : 'bg-red-50 text-red-600 border-red-100'
                 }`}>
                   {detectedMode === 'EtoK' ? '🇺🇸 English' : '🇰🇷 한국어'}
                 </span>
               )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                value={topicKeyword}
                onChange={(e) => setTopicKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateTodayTopic()}
                placeholder="✨키워드 입력(선택사항)"
                className="flex-1 sm:w-56 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={handleGenerateTodayTopic}
                disabled={topicLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all whitespace-nowrap ${
                  topicLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'lb-today-topic-btn bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.99]'
                }`}
                title="Gemini로 오늘의 학습 문장을 생성합니다"
              >
                {topicLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    오늘의 토픽
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || topicLoading || !inputText.trim()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                loading || topicLoading || !inputText.trim()
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {detectedMode === 'EtoK' ? '영어 분석하기' : '영작 시작하기'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center animate-pulse">
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Main Result Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
              <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <h2 className="font-bold">학습 결과</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-indigo-200 bg-indigo-700/50 px-2 py-1 rounded flex items-center gap-1">
                     <Volume2 className="w-3 h-3" />
                     단어를 클릭하여 네이티브 발음 듣기
                  </div>
                  <div className="flex items-center gap-1 bg-indigo-700/30 rounded-lg p-0.5 text-[10px] font-bold">
                    <button
                      onClick={() => setTtsRate(0.75)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        ttsRate === 0.75 ? 'bg-white text-indigo-700' : 'text-indigo-100 hover:bg-white/10'
                      }`}
                      title="Shadowing speed 0.75x"
                    >
                      0.75x
                    </button>
                    <button
                      onClick={() => setTtsRate(1.0)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        ttsRate === 1.0 ? 'bg-white text-indigo-700' : 'text-indigo-100 hover:bg-white/10'
                      }`}
                      title="Shadowing speed 1.0x"
                    >
                      1.0x
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {detectedMode === 'EtoK' ? (
                  /* Eng Input -> Kor Result */
                  <>
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Original English</div>
                      <ClickableEnglish text={result.originalText || inputText} className="text-xl font-medium text-slate-800 leading-relaxed" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Korean Meaning</div>
                      <p className="text-2xl font-bold text-slate-800 leading-relaxed break-keep">
                        {result.translation}
                      </p>
                    </div>

                    {result.nuance && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">Nuance & Context</span>
                        <p className="text-slate-700 mt-1 text-sm">{result.nuance}</p>
                      </div>
                    )}

                    {(dialogueLoading || dialogue) && (
                      <div className="mt-8 pt-8 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            실전 회화 (Context Dialogue)
                          </div>
                          {dialogue?.turns?.length > 0 && (
                            <div className="flex items-center gap-3">
                              {(isPreparingDialogueAudio || isPlayingFullDialogue) && (
                                <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-lg border border-slate-100">
                                  <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-400 transition-all duration-500 ease-out" 
                                      style={{ width: `${dialogueLoadingProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-black text-indigo-400 tabular-nums">{dialogueLoadingProgress}%</span>
                                </div>
                              )}
                              
                              {!isDialogueAudioReady ? (
                                <button
                                  onClick={handlePrepareDialogue}
                                  disabled={isPreparingDialogueAudio}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isPreparingDialogueAudio
                                      ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'
                                  }`}
                                >
                                  {isPreparingDialogueAudio ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      준비 중...
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      전체 대화 준비하기
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={handlePlayFullDialogue}
                                  disabled={isPlayingFullDialogue}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isPlayingFullDialogue
                                      ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100'
                                      : 'bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-95'
                                  }`}
                                >
                                  {isPlayingFullDialogue ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      재생 중...
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3" />
                                      전체 대화 듣기
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                          {dialogueLoading ? (
                            <div className="flex flex-col items-center py-10 text-slate-400 gap-3">
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <p className="text-sm font-medium">실전 회화 생성 중...</p>
                            </div>
                          ) : dialogue?.turns?.length > 0 ? (
                            <div className="space-y-4">
                              {dialogue.turns.map((t: any, i: number) => {
                                const isLiz = t.speaker === 'Liz';
                                const isCurrent = currentDialogueIndex === i;
                                return (
                                  <div
                                    key={i}
                                    className={`flex w-full ${isLiz ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
                                  >
                                    <div className={`relative max-w-[85%] group`}>
                                      <div className={`mb-1 flex items-center gap-2 ${isLiz ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isLiz ? 'text-indigo-400' : 'text-violet-400'}`}>
                                          {t.speaker}
                                        </span>
                                      </div>
                                      
                                      <div className={`p-4 rounded-2xl border transition-all ${
                                        isCurrent 
                                          ? 'ring-2 ring-indigo-500 shadow-md border-transparent bg-white' 
                                          : 'shadow-sm border-slate-100'
                                      } ${
                                        isLiz 
                                          ? 'bg-white rounded-tl-none border-slate-200' 
                                          : 'bg-white/60 rounded-tr-none border-indigo-100'
                                      }`}>
                                        <div className={`flex items-start gap-3 ${isLiz ? 'flex-row' : 'flex-row-reverse'}`}>
                                          <div className={`flex-1 min-w-0 ${isLiz ? 'text-left' : 'text-right'}`}>
                                            <div className="text-sm font-bold text-slate-800 leading-snug mb-1">
                                              {t.en}
                                            </div>
                                            {t.ko && (
                                              <div className="text-xs text-slate-500 font-medium break-keep">
                                                {t.ko}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => speak(t.en, isLiz ? 'WOMAN' : 'MAN')}
                                            className={`shrink-0 p-1.5 rounded-lg transition-all ${
                                              isSpeaking && speakingText === t.en
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-300 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100'
                                            }`}
                                            title="Listen"
                                          >
                                            <Volume2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Kor Input -> Eng Result */
                  <>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Original Korean</div>
                      <p className="text-lg text-slate-700">{result.originalText || inputText}</p>
                    </div>

                    <div className="space-y-6">
                      <div className="text-sm text-slate-400 font-medium border-b border-slate-100 pb-2">상황별 영작 제안</div>
                      {result.variations?.map((variant: any, idx: number) => (
                        <div key={idx} className="group relative bg-white hover:bg-indigo-50/50 p-0 rounded-xl transition-all">
                           <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                idx === 0 ? 'bg-blue-100 text-blue-700' :
                                idx === 1 ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {variant.style}
                              </span>
                              <button
                                onClick={() => copyToClipboard(variant.text, idx)}
                                className="ml-auto text-slate-300 hover:text-indigo-600 transition-colors p-1"
                                title="Copy text"
                              >
                                {copiedIndex === idx ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                           </div>
                           
                           <div className="pl-1">
                             <ClickableEnglish text={variant.text} className="text-lg font-medium text-slate-800" />
                           </div>
                        </div>
                      ))}
                    </div>

                    {(dialogueLoading || dialogue) && (
                      <div className="mt-8 pt-8 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            실전 회화 (Context Dialogue)
                          </div>
                          {dialogue?.turns?.length > 0 && (
                            <div className="flex items-center gap-3">
                              {(isPreparingDialogueAudio || isPlayingFullDialogue) && (
                                <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-lg border border-slate-100">
                                  <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-400 transition-all duration-500 ease-out" 
                                      style={{ width: `${dialogueLoadingProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-black text-indigo-400 tabular-nums">{dialogueLoadingProgress}%</span>
                                </div>
                              )}
                              
                              {!isDialogueAudioReady ? (
                                <button
                                  onClick={handlePrepareDialogue}
                                  disabled={isPreparingDialogueAudio}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isPreparingDialogueAudio
                                      ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'
                                  }`}
                                >
                                  {isPreparingDialogueAudio ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      준비 중...
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      전체 대화 준비하기
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={handlePlayFullDialogue}
                                  disabled={isPlayingFullDialogue}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isPlayingFullDialogue
                                      ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100'
                                      : 'bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-95'
                                  }`}
                                >
                                  {isPlayingFullDialogue ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      재생 중...
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3" />
                                      전체 대화 듣기
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                          {dialogueLoading ? (
                            <div className="flex flex-col items-center py-10 text-slate-400 gap-3">
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <p className="text-sm font-medium">실전 회화 생성 중...</p>
                            </div>
                          ) : dialogue?.turns?.length > 0 ? (
                            <div className="space-y-4">
                              {dialogue.turns.map((t: any, i: number) => {
                                const isLiz = t.speaker === 'Liz';
                                const isCurrent = currentDialogueIndex === i;
                                return (
                                  <div
                                    key={i}
                                    className={`flex w-full ${isLiz ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
                                  >
                                    <div className={`relative max-w-[85%] group`}>
                                      <div className={`mb-1 flex items-center gap-2 ${isLiz ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isLiz ? 'text-indigo-400' : 'text-violet-400'}`}>
                                          {t.speaker}
                                        </span>
                                      </div>
                                      
                                      <div className={`p-4 rounded-2xl border transition-all ${
                                        isCurrent 
                                          ? 'ring-2 ring-indigo-500 shadow-md border-transparent bg-white' 
                                          : 'shadow-sm border-slate-100'
                                      } ${
                                        isLiz 
                                          ? 'bg-white rounded-tl-none border-slate-200' 
                                          : 'bg-white/60 rounded-tr-none border-indigo-100'
                                      }`}>
                                        <div className={`flex items-start gap-3 ${isLiz ? 'flex-row' : 'flex-row-reverse'}`}>
                                          <div className={`flex-1 min-w-0 ${isLiz ? 'text-left' : 'text-right'}`}>
                                            <div className="text-sm font-bold text-slate-800 leading-snug mb-1">
                                              {t.en}
                                            </div>
                                            {t.ko && (
                                              <div className="text-xs text-slate-500 font-medium break-keep">
                                                {t.ko}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => speak(t.en, isLiz ? 'WOMAN' : 'MAN')}
                                            className={`shrink-0 p-1.5 rounded-lg transition-all ${
                                              isSpeaking && speakingText === t.en
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-300 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100'
                                            }`}
                                            title="Listen"
                                          >
                                            <Volume2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Vocabulary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.keywords?.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-indigo-700">{item.word}</h3>
                      <button 
                        onClick={() => speak(item.word)}
                        className={`p-1 rounded-full transition-colors flex items-center gap-1.5 ${
                          isSpeaking && speakingText === item.word 
                            ? 'text-indigo-600 bg-indigo-100' 
                            : 'text-indigo-200 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                         {isSpeaking && speakingText === item.word ? (
                           <>
                             <Loader2 className="w-4 h-4 animate-spin"/>
                             <span className={`text-[9px] font-bold uppercase tracking-tighter ${
                               ttsSource === 'gemini' ? 'text-indigo-600' : 'text-amber-600'
                             }`}>
                               {ttsSource === 'gemini' ? 'Gemini' : 'Browser'}
                             </span>
                           </>
                         ) : (
                           <Volume2 className="w-4 h-4" />
                         )}
                      </button>
                      <button
                        onClick={() =>
                          saveToVocab({
                            term: item.word,
                            meaning: detectedMode === 'EtoK' ? item.meaning : item.meaning, // keep as-is
                            exampleEn: detectedMode === 'EtoK' ? item.usage : undefined,
                            exampleKo: detectedMode === 'EtoK' ? item.usageTranslation : undefined,
                          })
                        }
                        className="p-1 rounded-full text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="단어장에 저장"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                    <Search className="w-4 h-4 text-slate-300 group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <p className="text-slate-600 font-medium mb-3">{item.meaning}</p>
                  
                  <div className="pt-3 border-t border-slate-100">
                    {detectedMode === 'EtoK' ? (
                      <>
                        <div className="flex items-start gap-2 mb-1">
                          <p className="text-sm text-slate-800 italic">"{item.usage}"</p>
                          <button 
                             onClick={() => speak(item.usage)}
                             className={`shrink-0 mt-0.5 transition-colors flex items-center gap-1 ${
                                isSpeaking && speakingText === item.usage
                                  ? 'text-indigo-600'
                                  : 'text-slate-300 hover:text-indigo-500'
                             }`}
                          >
                             {isSpeaking && speakingText === item.usage ? (
                               <>
                                 <Loader2 size={12} className="animate-spin"/>
                                 <span className={`text-[8px] font-bold uppercase tracking-tighter ${
                                   ttsSource === 'gemini' ? 'text-indigo-600' : 'text-amber-600'
                                 }`}>
                                   {ttsSource === 'gemini' ? 'Gemini' : 'Browser'}
                                 </span>
                               </>
                             ) : (
                               <Volume2 size={12} />
                             )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">{item.usageTranslation}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                        💡 {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quiz Section (NEW) */}
            <div className="mt-8 border-t border-slate-200 pt-8">
              {!quizData && !quizLoading && (
                <div className="text-center">
                  <button
                    onClick={handleGenerateQuiz}
                    className="group bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 mx-auto font-bold text-lg"
                  >
                    <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    AI 맞춤 퀴즈 풀기
                  </button>
                  <p className="text-slate-500 text-sm mt-3">
                    방금 학습한 내용을 바탕으로 Gemini가 문제를 만들어 줍니다.
                  </p>
                </div>
              )}

              {quizLoading && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">퀴즈 생성 중...</h3>
                  <p className="text-slate-500">AI가 문제를 출제하고 있습니다.</p>
                </div>
              )}

              {quizData && (
                <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in-up">
                  <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-yellow-400" />
                      <h2 className="text-xl font-bold">Review Quiz</h2>
                    </div>
                    {showScore && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
                        <Trophy className="w-4 h-4 text-yellow-300" />
                        <span className="font-bold">Score: {calculateScore()} / {quizData.questions.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-8">
                    {quizData.questions.map((q: any, index: number) => {
                      const isCorrect = userAnswers[q.id] === q.correctAnswerIndex;
                      
                      return (
                        <div key={q.id} className="space-y-4">
                          <div className="flex gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 pt-1">{q.question}</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                            {q.options.map((option: string, optIdx: number) => (
                              <button
                                key={optIdx}
                                onClick={() => handleQuizAnswer(q.id, optIdx)}
                                disabled={showScore}
                                className={`p-4 rounded-xl text-left border-2 transition-all ${
                                  showScore
                                    ? optIdx === q.correctAnswerIndex
                                      ? 'bg-green-50 border-green-500 text-green-800'
                                      : userAnswers[q.id] === optIdx
                                      ? 'bg-red-50 border-red-200 text-red-800'
                                      : 'bg-slate-50 border-transparent opacity-50'
                                    : userAnswers[q.id] === optIdx
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md'
                                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span>{option}</span>
                                  {showScore && optIdx === q.correctAnswerIndex && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                                  {showScore && userAnswers[q.id] === optIdx && optIdx !== q.correctAnswerIndex && <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                              </button>
                            ))}
                          </div>

                          {showScore && (
                            <div className={`ml-11 p-4 rounded-xl text-sm ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              <p className="font-bold mb-1">{isCorrect ? '🎉 정답입니다!' : '🤔 아쉽네요.'}</p>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!showScore && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(userAnswers).length < quizData.questions.length}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        제출하고 결과 보기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!result && !loading && (
          <div className="text-center py-12 opacity-50">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="text-slate-400 w-8 h-8" />
            </div>
            <p className="text-slate-500">
               한국어 또는 영어를 자유롭게 입력하세요.<br/>
               AI가 자동으로 언어를 감지하여 학습을 도와줍니다.
            </p>
          </div>
        )}

      </main>

      {/* Floating TTS Status Indicator */}
      {isSpeaking && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-3">
            <div className="relative">
              <Volume2 className="w-4 h-4 text-indigo-600" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Speaking via</span>
              <span className={`text-xs font-bold leading-tight ${ttsSource === 'gemini' ? 'text-indigo-600' : 'text-amber-600'}`}>
                {ttsSource === 'gemini' ? '✨ Gemini AI Model' : '🌐 Browser TTS Engine'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Perfect-score celebration (balloons + jingle) */}
      {showCelebration && <BalloonsOverlay key={celebrationKey} seed={celebrationKey} />}
    </div>
  );
};

export default App;