import { useState, useRef } from 'react';

interface UseAudioProps {
  apiBase: string;
  handleApiError: (err: any, retryAction: () => void, label: string, silent?: boolean) => void;
}

export const useAudio = ({ apiBase, handleApiError }: UseAudioProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [ttsSource, setTtsSource] = useState<'gemini' | 'browser' | null>(null);
  const [ttsRate, setTtsRate] = useState<0.75 | 1.0>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const audioCache = useRef<Map<string, string>>(new Map());
  const inFlightRequests = useRef<Map<string, Promise<string>>>(new Map());
  const ttsQueueRef = useRef<Promise<any>>(Promise.resolve());
  const lastTtsTimestamp = useRef<number>(0);

  const getAudioUrl = async (text: string, voice?: string, retryCount = 0): Promise<string> => {
    const cleanedText = text.trim();
    if (!cleanedText) return '';

    const cacheKey = voice ? `${voice}:${cleanedText}` : cleanedText;

    if (audioCache.current.has(cacheKey)) {
      return audioCache.current.get(cacheKey)!;
    }

    if (inFlightRequests.current.has(cacheKey)) {
      return inFlightRequests.current.get(cacheKey)!;
    }

    const fetchWithQueue = async (): Promise<string> => {
      await ttsQueueRef.current;

      try {
        const now = Date.now();
        const timeSinceLast = now - lastTtsTimestamp.current;
        const minWait = 1000; 
        if (timeSinceLast < minWait) {
          await new Promise(r => setTimeout(r, minWait - timeSinceLast));
        }

        const response = await fetch(`${apiBase}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanedText, voice }),
        }).catch(err => {
          handleApiError(err, () => getAudioUrl(text, voice), '음성 생성', true);
          throw err;
        });

        lastTtsTimestamp.current = Date.now();

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

    const nextTask = fetchWithQueue();
    ttsQueueRef.current = nextTask.catch(() => {});
    inFlightRequests.current.set(cacheKey, nextTask);
    
    return nextTask;
  };

  const speak = async (text: string, voice?: string): Promise<void> => {
    if (!text) return;
    
    if (isSpeaking && speakingText === text) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    return new Promise((resolve) => {
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
        if (window.speechSynthesis) {
          setIsSpeaking(true);
          setSpeakingText(text);
          setTtsSource('browser');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'ko-KR';
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

  return {
    isSpeaking,
    speakingText,
    ttsSource,
    ttsRate,
    setTtsRate,
    speak,
    getAudioUrl,
    audioRef
  };
};

