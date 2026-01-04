import { BookOpen, Globe, Volume2, WifiOff, RefreshCw, X, Star, Flame, History } from 'lucide-react';
import { useAppLogic } from './hooks/useAppLogic';

import HistorySidebar from './components/HistorySidebar';
import VocabSidebar from './components/VocabSidebar';
import DailyExpressionSection from './components/DailyExpressionSection';
import InputSection from './components/InputSection';
import AnalysisResultSection from './components/AnalysisResultSection';
import QuizSection from './components/QuizSection';
import BalloonsOverlay from './components/BalloonsOverlay';

const App = () => {
  const {
    dailyExpression, dailyRefreshing, streakState, vocab, setVocab, showVocab, setShowVocab,
    inputText, setInputText, loading, result, error, copiedIndex, topicKeyword, setTopicKeyword,
    topicLoading, quizData, quizLoading, userAnswers, showScore, celebrationKey, showCelebration,
    dialogue, dialogueLoading, currentDialogueIndex, isPlayingFullDialogue, isPreparingDialogueAudio,
    dialogueAudioLoadedCount, history, showHistory, setShowHistory, detectedMode, isConnectionError,
    setIsConnectionError, lastFailedAction, isDialogueAudioReady,
    speak, ttsSource, ttsRate, setTtsRate, isSpeaking, speakingText,
    handleRefreshDailyExpression, handleGenerateTodayTopic, handleAnalyze, loadHistoryItem,
    clearHistory, saveToVocab, handleGenerateQuiz, handlePrepareDialogue, handlePlayFullDialogue,
    handleQuizAnswer, handleSubmitQuiz, copyToClipboard, handleReset,
    removeVocab, clearVocab
  } = useAppLogic();

  const dialogueLoadingProgress = dialogue?.turns?.length > 0 
    ? Math.round((dialogueAudioLoadedCount / dialogue.turns.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      <HistorySidebar 
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        history={history}
        loadHistoryItem={loadHistoryItem}
        clearHistory={clearHistory}
      />

      <VocabSidebar 
        showVocab={showVocab}
        setShowVocab={setShowVocab}
        vocab={vocab}
        removeVocab={removeVocab}
        setVocab={setVocab}
        clearVocab={clearVocab}
      />

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
        <DailyExpressionSection 
          dailyExpression={dailyExpression}
          dailyRefreshing={dailyRefreshing}
          loading={loading}
          setInputText={setInputText}
          handleAnalyze={handleAnalyze}
          handleRefreshDailyExpression={handleRefreshDailyExpression}
        />
        
        <InputSection 
          inputText={inputText}
          setInputText={setInputText}
          detectedMode={detectedMode}
          handleReset={handleReset}
          topicKeyword={topicKeyword}
          setTopicKeyword={setTopicKeyword}
          topicLoading={topicLoading}
          handleGenerateTodayTopic={handleGenerateTodayTopic}
          handleAnalyze={handleAnalyze}
          loading={loading}
        />

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center animate-pulse">
            {error}
          </div>
        )}

        <AnalysisResultSection 
          result={result}
          detectedMode={detectedMode}
          inputText={inputText}
          speak={speak}
          speakingText={speakingText}
          isSpeaking={isSpeaking}
          ttsSource={ttsSource}
          ttsRate={ttsRate}
          setTtsRate={setTtsRate}
          dialogue={dialogue}
          dialogueLoading={dialogueLoading}
          isPreparingDialogueAudio={isPreparingDialogueAudio}
          isPlayingFullDialogue={isPlayingFullDialogue}
          isDialogueAudioReady={isDialogueAudioReady}
          dialogueLoadingProgress={dialogueLoadingProgress}
          currentDialogueIndex={currentDialogueIndex}
          handlePrepareDialogue={handlePrepareDialogue}
          handlePlayFullDialogue={handlePlayFullDialogue}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
          saveToVocab={saveToVocab}
        />

        <QuizSection 
          quizData={quizData}
          quizLoading={quizLoading}
          userAnswers={userAnswers}
          showScore={showScore}
          handleGenerateQuiz={handleGenerateQuiz}
          handleQuizAnswer={handleQuizAnswer}
          handleSubmitQuiz={handleSubmitQuiz}
        />
        
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

      {showCelebration && <BalloonsOverlay key={celebrationKey} seed={celebrationKey} />}
    </div>
  );
};

export default App;
