import { Sparkles, RotateCcw, Loader2, Globe } from 'lucide-react';

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  detectedMode: 'EtoK' | 'KtoE';
  handleReset: () => void;
  topicKeyword: string;
  setTopicKeyword: (text: string) => void;
  topicLoading: boolean;
  handleGenerateTodayTopic: () => Promise<void>;
  handleAnalyze: () => Promise<void>;
  loading: boolean;
}

const InputSection = ({
  inputText,
  setInputText,
  detectedMode,
  handleReset,
  topicKeyword,
  setTopicKeyword,
  topicLoading,
  handleGenerateTodayTopic,
  handleAnalyze,
  loading,
}: InputSectionProps) => {
  return (
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
          data-testid="main-input"
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
  );
};

export default InputSection;

