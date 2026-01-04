import { Calendar, Sparkles, RefreshCw } from 'lucide-react';

interface DailyExpressionSectionProps {
  dailyExpression: any;
  dailyRefreshing: boolean;
  loading: boolean;
  setInputText: (text: string) => void;
  handleAnalyze: (retryCount?: number, textOverride?: string) => Promise<void>;
  handleRefreshDailyExpression: () => Promise<void>;
}

const DailyExpressionSection = ({
  dailyExpression,
  dailyRefreshing,
  loading,
  setInputText,
  handleAnalyze,
  handleRefreshDailyExpression,
}: DailyExpressionSectionProps) => {
  if (!dailyExpression && dailyRefreshing) {
    return (
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
    );
  }

  if (!dailyExpression?.expression) return null;

  return (
    <div className="relative bg-gradient-to-br from-indigo-600 to-violet-500 rounded-3xl p-8 text-white shadow-xl overflow-hidden group">
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
  );
};

export default DailyExpressionSection;

