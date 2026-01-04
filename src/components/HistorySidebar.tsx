import { History, X, Clock, Trash2 } from 'lucide-react';

interface HistorySidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  history: any[];
  loadHistoryItem: (item: any) => void;
  clearHistory: () => void;
}

const HistorySidebar = ({
  showHistory,
  setShowHistory,
  history,
  loadHistoryItem,
  clearHistory,
}: HistorySidebarProps) => {
  if (!showHistory) return null;

  return (
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
  );
};

export default HistorySidebar;

