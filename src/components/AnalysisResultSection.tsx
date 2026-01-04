import { GraduationCap, Volume2, Sparkles, Loader2, Clock, Copy, Check, Search, Star } from 'lucide-react';
import ClickableEnglish from './ClickableEnglish';

interface AnalysisResultSectionProps {
  result: any;
  detectedMode: 'EtoK' | 'KtoE';
  inputText: string;
  speak: (text: string, voice?: string) => Promise<void>;
  speakingText: string | null;
  isSpeaking: boolean;
  ttsSource: 'gemini' | 'browser' | null;
  ttsRate: number;
  setTtsRate: (rate: 0.75 | 1.0) => void;
  dialogue: any;
  dialogueLoading: boolean;
  isPreparingDialogueAudio: boolean;
  isPlayingFullDialogue: boolean;
  isDialogueAudioReady: boolean;
  dialogueLoadingProgress: number;
  currentDialogueIndex: number | null;
  handlePrepareDialogue: () => Promise<void>;
  handlePlayFullDialogue: () => Promise<void>;
  copyToClipboard: (text: string, index: number) => void;
  copiedIndex: number | null;
  saveToVocab: (item: any) => void;
}

const AnalysisResultSection = ({
  result,
  detectedMode,
  inputText,
  speak,
  speakingText,
  isSpeaking,
  ttsSource,
  ttsRate,
  setTtsRate,
  dialogue,
  dialogueLoading,
  isPreparingDialogueAudio,
  isPlayingFullDialogue,
  isDialogueAudioReady,
  dialogueLoadingProgress,
  currentDialogueIndex,
  handlePrepareDialogue,
  handlePlayFullDialogue,
  copyToClipboard,
  copiedIndex,
  saveToVocab,
}: AnalysisResultSectionProps) => {
  if (!result) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Main Result Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            < GraduationCap className="w-5 h-5" />
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
            <>
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Original English</div>
                <ClickableEnglish 
                  text={result.originalText || inputText} 
                  className="text-xl font-medium text-slate-800 leading-relaxed"
                  speak={speak}
                  speakingText={speakingText}
                  isSpeaking={isSpeaking}
                  ttsSource={ttsSource}
                />
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
                       <ClickableEnglish 
                        text={variant.text} 
                        className="text-lg font-medium text-slate-800"
                        speak={speak}
                        speakingText={speakingText}
                        isSpeaking={isSpeaking}
                        ttsSource={ttsSource}
                       />
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
                      meaning: item.meaning,
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
    </div>
  );
};

export default AnalysisResultSection;

