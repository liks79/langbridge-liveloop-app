import { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, GraduationCap, Copy, Check, RotateCcw, Search, Volume2, Globe, Loader2, HelpCircle, CheckCircle2, XCircle, Trophy, History, X, Trash2, Clock } from 'lucide-react';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Quiz States
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({});
  const [showScore, setShowScore] = useState(false);

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 오디오 캐시 저장소 (Key: 텍스트, Value: Blob URL)
  const audioCache = useRef<Map<string, string>>(new Map());

  // 현재 진행 중인 API 요청 추적 (중복 방지용)
  const inFlightRequests = useRef<Map<string, Promise<string>>>(new Map());
  // NOTE:
  // - Gemini API 호출은 브라우저에서 직접 하지 않고, 같은 도메인의 Worker(`/api/*`)로만 호출합니다.
  // - API Key는 Worker의 Cloudflare Secret로만 보관되어 브라우저/레포에 노출되지 않습니다.

  // 히스토리 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('english-live-loop-history', JSON.stringify(history));
  }, [history]);

  // 1. 언어 자동 감지 로직
  useEffect(() => {
    if (!inputText.trim()) {
      setDetectedMode('EtoK');
      return;
    }
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(inputText);
    setDetectedMode(hasKorean ? 'KtoE' : 'EtoK');
  }, [inputText]);

  // 오디오 URL 가져오기 (Worker `/api/tts` 사용)
  const getAudioUrl = async (text: string, retryCount = 0): Promise<string> => {
    // 1. 캐시 확인
    if (audioCache.current.has(text)) {
      return audioCache.current.get(text)!;
    }

    // 2. 이미 동일한 텍스트로 요청이 진행 중인지 확인
    if (inFlightRequests.current.has(text)) {
      return inFlightRequests.current.get(text)!;
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        // 429 오류 처리: 지수 백오프(Exponential Backoff) 재시도
        if (response.status === 429 && retryCount < 2) {
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return getAudioUrl(text, retryCount + 1);
        }

        if (!response.ok) throw new Error('TTS API Error: ' + response.status);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioCache.current.set(text, audioUrl);
        return audioUrl;
      } finally {
        // 요청이 끝나면 목록에서 제거
        inFlightRequests.current.delete(text);
      }
    })();

    // 진행 중인 요청 목록에 등록
    inFlightRequests.current.set(text, fetchPromise);
    return fetchPromise;
  };

  // TTS 재생 함수
  const speak = async (text: string) => {
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

    // 한글이 포함된 경우 브라우저 TTS 사용 (AI TTS는 영문 최적화 및 오류 방지)
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
      if (window.speechSynthesis) {
        setIsSpeaking(true);
        setSpeakingText(text);
        setTtsSource('browser');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR'; // 한국어 설정
        utterance.rate = 1.0;
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
          setTtsSource(null);
        };
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    // 영어인 경우 AI TTS 시도
    setIsSpeaking(true);
    setSpeakingText(text);
    setTtsSource('gemini');

    try {
      const audioUrl = await getAudioUrl(text);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingText(null);
        setTtsSource(null);
      };
      
      await audio.play();

    } catch (err) {
      // 오류 발생 시 경고 로그만 남기고 브라우저 TTS로 폴백
      console.warn("AI TTS Failed, falling back to browser TTS", err);
      setTtsSource('browser');
      
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
          setTtsSource(null);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        setSpeakingText(null);
        setTtsSource(null);
      }
    }
  };

  const handleAnalyze = async (retryCount = 0) => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError('');
    if (retryCount === 0) {
      setResult(null);
      setQuizData(null); 
      setUserAnswers({});
      setShowScore(false);
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          detectedMode,
        }),
      });

      // 429 오류 처리 (Too Many Requests)
      if (response.status === 429 && retryCount < 2) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return handleAnalyze(retryCount + 1);
      }

      if (!response.ok) throw new Error(`AI 응답 실패: ${response.status}`);

      const parsedContent = await response.json();
      setResult(parsedContent);

      // 히스토리 추가 (최신 100개 유지)
      const newItem = {
        id: Date.now(),
        text: inputText,
        mode: detectedMode,
        result: parsedContent,
        timestamp: new Date().toLocaleString()
      };
      
      setHistory(prev => {
        const newHistory = [newItem, ...prev];
        return newHistory.slice(0, 100);
      });

    } catch (err) {
      setError('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
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

  // 퀴즈 생성 함수
  const handleGenerateQuiz = async () => {
    if (!result) return;
    setQuizLoading(true);
    setError('');

    try {
      const response = await fetch('/api/quiz', {
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
      console.error(err);
      setError('퀴즈를 생성하는 중 문제가 발생했습니다.');
    } finally {
      setQuizLoading(false);
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

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
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

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !inputText.trim()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                loading || !inputText.trim()
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
                <div className="text-xs text-indigo-200 bg-indigo-700/50 px-2 py-1 rounded flex items-center gap-1">
                   <Volume2 className="w-3 h-3" />
                   단어를 클릭하여 네이티브 발음 듣기
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
                        onClick={() => setShowScore(true)}
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
    </div>
  );
};

export default App;