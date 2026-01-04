import { Volume2, Loader2 } from 'lucide-react';

interface ClickableEnglishProps {
  text: string;
  className?: string;
  speak: (text: string, voice?: string) => Promise<void>;
  speakingText: string | null;
  isSpeaking: boolean;
  ttsSource: 'gemini' | 'browser' | null;
}

const ClickableEnglish = ({ 
  text, 
  className = "", 
  speak, 
  speakingText, 
  isSpeaking, 
  ttsSource 
}: ClickableEnglishProps) => {
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

export default ClickableEnglish;

