import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { AssessmentQuiz, QuizQuestion } from '../types';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';

interface AssessmentsProps {
  user: User;
}

const QuizView: React.FC<{ quiz: AssessmentQuiz; onComplete: (score: number) => void }> = ({ quiz, onComplete }) => {
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
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      let score = 0;
      quiz.questions.forEach((q, i) => {
        if (q.correctAnswer === selectedAnswers[i]) {
          score++;
        }
      });
      onComplete(score);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{quiz.topic}</h2>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
      </div>
      <p className="text-lg mb-6">{currentQuestion.question}</p>
      <div className="space-y-3">
        {currentQuestion.options.map(option => (
          <button
            key={option}
            onClick={() => handleAnswerSelect(option)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedAnswers[currentQuestionIndex] === option ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent'}`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleNext} disabled={!selectedAnswers[currentQuestionIndex]} className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
          {currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

const ResultsView: React.FC<{ quiz: AssessmentQuiz; score: number; onRestart: () => void }> = ({ quiz, score, onRestart }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-2">Quiz Complete!</h2>
        <p className="text-center text-4xl font-bold mb-6">
            Your score: {score} / {quiz.questions.length}
        </p>
        <div className="space-y-4">
            {quiz.questions.map((q, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <p className="font-semibold">{i + 1}. {q.question}</p>
                    <p className={`mt-2 flex items-center text-sm font-semibold ${q.correctAnswer === q.correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                       <CheckIcon className="h-5 w-5 mr-2" /> Correct Answer: {q.correctAnswer}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <strong>Explanation:</strong> {q.explanation}
                    </p>
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-center">
            <button onClick={onRestart} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                Take Another Quiz
            </button>
        </div>
    </div>
);

const Assessments: React.FC<AssessmentsProps> = ({ user }) => {
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [quiz, setQuiz] = useState<AssessmentQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for the assessment.');
      return;
    }
    setError('');
    setIsLoading(true);
    setQuiz(null);
    setScore(null);
    try {
      const result = await apiClient.generateAssessment(topic, numQuestions);
      setQuiz(result);
    } catch (err) {
      setError('Failed to generate assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestart = () => {
      setQuiz(null);
      setScore(null);
      setTopic('');
  }

  if (quiz && score !== null) {
      return <ResultsView quiz={quiz} score={score} onRestart={handleRestart} />;
  }

  if (quiz) {
      return <QuizView quiz={quiz} onComplete={(finalScore) => setScore(finalScore)} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generate Assessment</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 w-full">
            <label htmlFor="topic-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Enter a Topic
            </label>
            <input
              type="text"
              id="topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'Quantum Superposition' or 'Roman Architecture'"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="w-full md:w-48">
            <label htmlFor="num-questions" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              No. of Questions
            </label>
            <input
              type="number"
              id="num-questions"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(3, Math.min(10, parseInt(e.target.value, 10) || 3)))}
              min="3"
              max="10"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex-shrink-0"
          >
            {isLoading ? 'Generating...' : 'Generate Quiz'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {isLoading && (
        <div className="text-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Generating your quiz, please wait...</p>
        </div>
      )}

      {!isLoading && !quiz && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Ready to test your knowledge?</h3>
            <p className="text-gray-500 mt-2">Enter a topic above and generate a quiz to get started.</p>
          </div>
      )}
    </div>
  );
};

export default Assessments;
