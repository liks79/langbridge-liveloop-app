import { Star, X, Trash2 } from 'lucide-react';
import type { VocabItem } from '../lib/vocabStore';

interface VocabSidebarProps {
  showVocab: boolean;
  setShowVocab: (show: boolean) => void;
  vocab: VocabItem[];
  removeVocab: (id: string) => VocabItem[];
  setVocab: (vocab: VocabItem[]) => void;
  clearVocab: () => void;
}

const VocabSidebar = ({
  showVocab,
  setShowVocab,
  vocab,
  removeVocab,
  setVocab,
  clearVocab,
}: VocabSidebarProps) => {
  if (!showVocab) return null;

  return (
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
  );
};

export default VocabSidebar;

