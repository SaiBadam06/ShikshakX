import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { apiClient } from '../services/apiClient';
import { db } from '../services/firebase';
import type { AssessmentQuiz, QuizAttempt } from '../types';
import { ArrowPathIcon, CheckIcon, ClockIcon, FireIcon, SparklesIcon, TrophyIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';
import { formatDateTime, toDate } from '../utils/date';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';

interface AssessmentsProps {
  user: User;
}

const QuizView: React.FC<{ quiz: AssessmentQuiz; onComplete: (score: number, answers: string[]) => void }> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    let finalScore = 0;
    quiz.questions.forEach((question, index) => {
      if (question.correctAnswer === selectedAnswers[index]) {
        finalScore += 1;
      }
    });
    onComplete(finalScore, selectedAnswers);
  };

  return (
    <div className="app-panel-strong rounded-[2rem] p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Live quiz</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{quiz.topic}</h2>
        </div>
        <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </p>
      </div>

      <div className="rounded-[1.5rem] bg-slate-50 p-5">
        <p className="text-lg font-bold leading-8 text-slate-950">{currentQuestion.question}</p>
      </div>

      <div className="mt-5 space-y-3">
        {currentQuestion.options.map((option) => (
          <button
            key={option}
            onClick={() => handleAnswerSelect(option)}
            className={`w-full rounded-[1.25rem] border px-4 py-4 text-left text-sm font-medium transition ${
              selectedAnswers[currentQuestionIndex] === option
                ? 'border-blue-300 bg-blue-50 text-blue-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleNext} disabled={!selectedAnswers[currentQuestionIndex]} className="app-button-primary px-6 py-3 text-sm">
          {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

const ResultsView: React.FC<{
  quiz: AssessmentQuiz;
  score: number;
  answers: string[];
  onRestart: () => void;
}> = ({ quiz, score, answers, onRestart }) => (
  <div className="app-panel-strong rounded-[2rem] p-6 md:p-8">
    <div className="text-center">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-amber-50 text-amber-600">
        <TrophyIcon className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">Quiz complete</h2>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
        {score} / {quiz.questions.length}
      </p>
    </div>

    <div className="mt-8 space-y-4">
      {quiz.questions.map((question, index) => (
        <div key={`${question.question}-${index}`} className="rounded-[1.35rem] bg-slate-50 p-4">
          <p className="font-semibold text-slate-950">{index + 1}. {question.question}</p>
          <p className={`mt-3 flex items-center text-sm font-semibold ${answers[index] === question.correctAnswer ? 'text-emerald-600' : 'text-red-600'}`}>
            {answers[index] === question.correctAnswer ? <CheckIcon className="mr-2 h-5 w-5" /> : <XMarkIcon className="mr-2 h-5 w-5" />}
            Your answer: {answers[index] || 'No answer selected'}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">Correct answer: {question.correctAnswer}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{question.explanation}</p>
        </div>
      ))}
    </div>

    <div className="mt-6 flex justify-center">
      <button onClick={onRestart} className="app-button-primary px-8 py-3 text-sm">
        <ArrowPathIcon className="h-5 w-5" />
        Generate Another Quiz
      </button>
    </div>
  </div>
);

const Assessments: React.FC<AssessmentsProps> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState<AssessmentQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [importedTopic, setImportedTopic] = useState('');
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  useEffect(() => {
    const storedTopic = localStorage.getItem('shikshakx-quiz-topic');
    if (!storedTopic) {
      return;
    }

    setTopic(storedTopic);
    setImportedTopic(storedTopic);
    localStorage.removeItem('shikshakx-quiz-topic');
  }, []);

  useEffect(() => {
    const loadAttempts = async () => {
      try {
        const attemptsQuery = query(
          collection(db, 'users', user.uid, 'assessmentAttempts'),
          orderBy('createdAt', 'desc'),
          limit(8),
        );

        const snapshot = await getDocs(attemptsQuery);
        const loadedAttempts = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            topic: data.topic,
            score: data.score,
            totalQuestions: data.totalQuestions,
            answers: data.answers || [],
            questions: data.questions || [],
            createdAt: toDate(data.createdAt),
          } as QuizAttempt;
        });

        setAttempts(loadedAttempts);
        if (loadedAttempts.length > 0) {
          setSelectedAttemptId((current) => current ?? loadedAttempts[0].id);
        }
      } catch (attemptError) {
        console.error('Failed to load assessment attempts:', attemptError);
      }
    };

    loadAttempts();
  }, [user.uid]);

  const recentTopicQuestions = useMemo(() => {
    if (!topic.trim()) {
      return [];
    }

    return attempts
      .filter((attempt) => attempt.topic.toLowerCase() === topic.trim().toLowerCase())
      .slice(0, 3)
      .flatMap((attempt) => attempt.questions.map((question) => question.question));
  }, [attempts, topic]);

  const latestAttempt = attempts[0];
  const reviewAttempt = attempts.find((attempt) => attempt.id === reviewAttemptId) || null;
  const bestAttempt = attempts.reduce<QuizAttempt | null>((best, attempt) => {
    if (!best) {
      return attempt;
    }
    return attempt.score > best.score ? attempt : best;
  }, null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for the assessment.');
      return;
    }

    setError('');
    setIsLoading(true);
    setQuiz(null);
    setScore(null);
    setAnswers([]);

    try {
      const generatedQuiz = await apiClient.generateAssessment(topic.trim(), numQuestions, recentTopicQuestions);
      setQuiz(generatedQuiz);
    } catch (generationError: any) {
      setError(generationError.message || 'Failed to generate an AI quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAttempt = async (completedQuiz: AssessmentQuiz, finalScore: number, selectedAnswers: string[]) => {
    setIsSavingAttempt(true);
    try {
      const attemptPayload = {
        topic: completedQuiz.topic,
        score: finalScore,
        totalQuestions: completedQuiz.questions.length,
        answers: selectedAnswers,
        questions: completedQuiz.questions,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'assessmentAttempts'), attemptPayload);
      const savedAttempt = {
          id: docRef.id,
          ...attemptPayload,
        } as QuizAttempt;
      setSelectedAttemptId(savedAttempt.id);
      setAttempts((currentAttempts) => [
        savedAttempt,
        ...currentAttempts,
      ].slice(0, 8));
    } catch (saveError) {
      console.error('Failed to save assessment attempt:', saveError);
      toast.error('Quiz finished, but the attempt history could not be saved.');
    } finally {
      setIsSavingAttempt(false);
    }
  };

  const handleRestart = () => {
    setQuiz(null);
    setScore(null);
    setAnswers([]);
  };

  if (quiz && score !== null) {
    return (
      <div className="animate-fade-in space-y-6">
        {isSavingAttempt && (
          <div className="rounded-[1.35rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Saving this attempt to your quiz history...
          </div>
        )}
        <ResultsView quiz={quiz} score={score} answers={answers} onRestart={handleRestart} />
      </div>
    );
  }

  if (quiz) {
    return (
      <div className="animate-fade-in space-y-6">
        <QuizView quiz={quiz} onComplete={(finalScore, selectedAnswers) => {
          setAnswers(selectedAnswers);
          setScore(finalScore);
          void saveAttempt(quiz, finalScore, selectedAnswers);
        }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel-strong hero-gradient rounded-[2rem] p-8 md:p-10">
        <div className="page-eyebrow mb-5">
          <SparklesIcon className="h-4 w-4" />
          AI assessment studio
        </div>
        <h1 className="page-title text-slate-950">Generate a fresh quiz every time.</h1>
        <p className="page-copy mt-4 max-w-3xl text-lg">
          This quiz flow is now AI-first. It avoids recently used questions on the same topic and keeps your latest results visible for comparison.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="app-panel-strong rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="topic-input" className="mb-2 block text-sm font-semibold text-slate-700">
                Topic
              </label>
              <input
                type="text"
                id="topic-input"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g., Quantum Superposition, Roman Architecture, ACID Transactions"
                className="app-input block w-full px-4 py-3 text-sm"
              />
            </div>
            <div className="w-full md:w-48">
              <label htmlFor="num-questions" className="mb-2 block text-sm font-semibold text-slate-700">
                Questions
              </label>
              <input
                type="number"
                id="num-questions"
                value={numQuestions}
                onChange={(event) => setNumQuestions(Math.max(3, Math.min(10, parseInt(event.target.value, 10) || 3)))}
                min="3"
                max="10"
                className="app-input block w-full px-4 py-3 text-sm"
              />
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="app-button-primary w-full px-6 py-3 text-sm md:w-auto">
              {isLoading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </div>

          {topic.trim() && recentTopicQuestions.length > 0 && (
            <div className="mt-5 rounded-[1.35rem] bg-slate-50 p-4 text-sm text-slate-600">
              The AI will avoid the last {recentTopicQuestions.length} questions you saw for this topic.
            </div>
          )}

          {importedTopic && (
            <div className="mt-5 rounded-[1.35rem] border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
              Topic carried from AI chat: <span className="font-semibold text-violet-950">{importedTopic}</span>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          {isLoading && (
            <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-10 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="mt-4 text-sm text-slate-600">Asking the AI for a fresh, non-repetitive quiz...</p>
            </div>
          )}

          {!isLoading && (
            <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-900">What changed</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>AI creates the quiz itself instead of falling back to predefined questions.</li>
                <li>Recent questions from the same topic are blocked to reduce repetition.</li>
                <li>Your past attempts are saved so you can track whether you are improving.</li>
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="app-panel rounded-[1.75rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Performance snapshot</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.35rem] bg-slate-50 p-4">
                <div className="inline-flex rounded-2xl bg-amber-50 p-2 text-amber-600">
                  <TrophyIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Best score</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  {bestAttempt ? `${bestAttempt.score}/${bestAttempt.totalQuestions}` : '--'}
                </p>
              </div>
              <div className="rounded-[1.35rem] bg-slate-50 p-4">
                <div className="inline-flex rounded-2xl bg-blue-50 p-2 text-blue-600">
                  <ClockIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Latest attempt</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {latestAttempt ? `${latestAttempt.topic} on ${formatDateTime(latestAttempt.createdAt)}` : 'No attempts yet'}
                </p>
              </div>
              <div className="rounded-[1.35rem] bg-slate-50 p-4">
                <div className="inline-flex rounded-2xl bg-rose-50 p-2 text-rose-600">
                  <FireIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Attempts saved</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{attempts.length}</p>
              </div>
            </div>
          </section>

          <section className="app-panel rounded-[1.75rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Previous results</p>
            <div className="mt-4 space-y-3">
              {attempts.length > 0 ? attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => {
                    setSelectedAttemptId(attempt.id);
                    setReviewAttemptId(attempt.id);
                  }}
                  className={`w-full rounded-[1.25rem] p-4 text-left transition ${
                    selectedAttemptId === attempt.id
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{attempt.topic}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {formatDateTime(attempt.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">
                      {attempt.score}/{attempt.totalQuestions}
                    </div>
                  </div>
                </button>
              )) : (
                <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-500">
                  Your previous quiz attempts will appear here once you complete one.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        isOpen={Boolean(reviewAttempt)}
        onClose={() => setReviewAttemptId(null)}
        title={reviewAttempt ? `Attempt Review • ${reviewAttempt.topic}` : 'Attempt Review'}
        size="wide"
      >
        {reviewAttempt && (
          <div className="space-y-4">
            <div className="rounded-[1.25rem] bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">{reviewAttempt.topic}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {formatDateTime(reviewAttempt.createdAt)}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Score: <span className="font-semibold text-slate-900">{reviewAttempt.score}/{reviewAttempt.totalQuestions}</span>
              </p>
            </div>
            <div className="space-y-3">
              {reviewAttempt.questions.map((question, index) => {
                const selectedAnswer = reviewAttempt.answers[index] || 'No answer selected';
                const isCorrect = reviewAttempt.answers[index] === question.correctAnswer;

                return (
                  <div key={`${reviewAttempt.id}-${index}`} className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">{index + 1}. {question.question}</p>
                    <p className={`mt-3 flex items-center text-sm font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? <CheckIcon className="mr-2 h-5 w-5" /> : <XMarkIcon className="mr-2 h-5 w-5" />}
                      Your answer: {selectedAnswer}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Correct answer: {question.correctAnswer}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{question.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assessments;
