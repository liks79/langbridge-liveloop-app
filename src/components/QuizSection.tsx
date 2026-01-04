import { HelpCircle, Trophy, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useMemo } from 'react';

interface QuizSectionProps {
  quizData: any;
  quizLoading: boolean;
  userAnswers: { [key: number]: number };
  showScore: boolean;
  handleGenerateQuiz: () => Promise<void>;
  handleQuizAnswer: (questionId: number, optionIndex: number) => void;
  handleSubmitQuiz: () => Promise<void>;
}

const QuizSection = ({
  quizData,
  quizLoading,
  userAnswers,
  showScore,
  handleGenerateQuiz,
  handleQuizAnswer,
  handleSubmitQuiz,
}: QuizSectionProps) => {
  const calculateScore = () => {
    if (!quizData) return 0;
    let correct = 0;
    quizData.questions.forEach((q: any) => {
      if (userAnswers[q.id] === q.correctAnswerIndex) correct++;
    });
    return correct;
  };

  if (!quizData && !quizLoading) {
    return (
      <div className="mt-8 border-t border-slate-200 pt-8">
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
      </div>
    );
  }

  if (quizLoading) {
    return (
      <div className="mt-8 border-t border-slate-200 pt-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">퀴즈 생성 중...</h3>
          <p className="text-slate-500">AI가 문제를 출제하고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
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
    </div>
  );
};

export default QuizSection;

