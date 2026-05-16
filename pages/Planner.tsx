import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { PlanTask } from '../types';
import { toast } from '../components/Toast';
import { initGoogleCalendar, handleAuthClick, createCalendarEvent, GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../services/calendarClient';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';

type PlannerHistoryEntry = {
  id: string;
  topic: string;
  scope: string;
  duration: number;
  tasks: PlanTask[];
  createdAt: Date | string | number;
};

interface PlannerProps {
  user: User;
}

const Planner: React.FC<PlannerProps> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [scope, setScope] = useState('');
  const [duration, setDuration] = useState(7);
  const [plan, setPlan] = useState<PlanTask[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGcalAuthorized, setIsGcalAuthorized] = useState(false);
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);
  const [isSavingPlanToCalendar, setIsSavingPlanToCalendar] = useState(false);
  const [hasSavedPlanToCalendar, setHasSavedPlanToCalendar] = useState(false);
  const [planHistory, setPlanHistory] = useState<PlannerHistoryEntry[]>([]);

  const isGcalConfigured = !GOOGLE_API_KEY.startsWith("YOUR_") && !GOOGLE_CLIENT_ID.startsWith("YOUR_");

  useEffect(() => {
    if (isGcalConfigured) {
      initGoogleCalendar(setIsGcalAuthorized);
    }
  }, [isGcalConfigured]);

  useEffect(() => {
    const plannerHistoryQuery = query(
      collection(db, 'users', user.uid, 'plannerHistory'),
      orderBy('createdAt', 'desc'),
      limit(8),
    );

    const unsubscribe = onSnapshot(plannerHistoryQuery, (snapshot) => {
      const nextHistory = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          topic: data.topic || 'Study plan',
          scope: data.scope || '',
          duration: data.duration || 7,
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as PlannerHistoryEntry;
      });

      setPlanHistory(nextHistory);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleGeneratePlan = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to plan.');
      return;
    }
    setError('');
    setIsLoading(true);
    setPlan(null);
    setShowCalendarPrompt(false);
    setHasSavedPlanToCalendar(false);
    try {
      const result = await apiClient.generatePlan(topic, duration, scope);
      setPlan(result);
      setShowCalendarPrompt(true);
      try {
        await addDoc(collection(db, 'users', user.uid, 'plannerHistory'), {
          topic: topic.trim(),
          scope: scope.trim(),
          duration,
          tasks: result,
          createdAt: new Date(),
        });
      } catch (historyError) {
        console.error('Failed to save planner history:', historyError);
        toast.info('The plan was generated, but planner history could not be saved right now.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlanToCalendar = async () => {
    if (!plan?.length) {
      return;
    }

    if (!isGcalAuthorized) {
      toast.info('Connecting Google Calendar so the full plan can be saved.');
      const authorized = await handleAuthClick();
      setIsGcalAuthorized(Boolean(authorized));
      if (!authorized) {
        return;
      }
    }

    try {
      setIsSavingPlanToCalendar(true);

      for (const task of plan) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + task.day - 1);
        eventDate.setHours(9, 0, 0, 0);

        await createCalendarEvent({
          title: task.title,
          description: task.description,
          dueDate: eventDate,
        });
      }

      setHasSavedPlanToCalendar(true);
      setShowCalendarPrompt(false);
      toast.success(`Your ${plan.length}-day plan was added to Google Calendar.`);
    } catch (e) {
      toast.error('Failed to save the full plan to Google Calendar.');
    } finally {
      setIsSavingPlanToCalendar(false);
    }
  };

  const groupedPlan = plan?.reduce((acc, task) => {
    const day = `Day ${task.day}`;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(task);
    return acc;
  }, {} as Record<string, PlanTask[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Study Planner</h1>
      <div className="hover-lift bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="topic-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              What do you want to learn?
            </label>
            <input
              type="text"
              id="topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'React Hooks' or 'The History of Rome'"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="scope-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              What should this help you achieve?
            </label>
            <input
              type="text"
              id="scope-input"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g., 'build websites', 'crack a beginner interview', 'understand the full basics'"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="duration-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Duration (days)
            </label>
            <input
              type="number"
              id="duration-input"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Planner mode</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your roadmap will assume you are a beginner starting from scratch, then build you through fundamentals,
            guided practice, revision, and small real-world outcomes.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGeneratePlan}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Generating Plan...' : 'Generate Plan'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {isLoading && (
        <div className="text-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Building your personalized study plan...</p>
        </div>
      )}

      {groupedPlan && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="hover-lift bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Starting point</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Complete beginner</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The plan teaches from zero and adds difficulty gradually.</p>
                </div>
                <div className="hover-lift bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Topic</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{topic}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{duration} day learning path</p>
                </div>
                <div className="hover-lift bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Goal scope</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{scope.trim() || 'Strong fundamentals first'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Later days will aim toward this outcome.</p>
                </div>
            </div>
            {showCalendarPrompt && (
                <div className="hover-lift rounded-2xl border border-blue-100 bg-blue-50/90 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/40">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Save this full study plan to Google Calendar?</p>
                    <p className="mt-2 text-sm leading-6 text-blue-700 dark:text-blue-300">
                        Your day-by-day roadmap is ready. You can now save the entire {duration}-day plan to Google Calendar in one go instead of adding each day manually.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={handleSavePlanToCalendar}
                          disabled={isSavingPlanToCalendar}
                          className="app-button-primary px-5 py-3 text-sm"
                        >
                          {isSavingPlanToCalendar
                            ? 'Saving full plan...'
                            : isGcalAuthorized
                              ? 'Save full plan to Calendar'
                              : 'Connect Calendar and Save'}
                        </button>
                        <button
                          onClick={() => setShowCalendarPrompt(false)}
                          disabled={isSavingPlanToCalendar}
                          className="app-button-secondary px-5 py-3 text-sm"
                        >
                          Not now
                        </button>
                    </div>
                </div>
            )}
            {hasSavedPlanToCalendar && (
                <div className="hover-lift rounded-2xl border border-emerald-100 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Calendar synced</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                        The complete day-by-day plan has been saved to your Google Calendar.
                    </p>
                </div>
            )}
            {Object.entries(groupedPlan).map(([day, tasks]) => (
                <div key={day}>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 pb-2 mb-4 border-b-2 border-gray-200 dark:border-gray-700">{day}</h2>
                    <div className="space-y-3">
                        {(tasks as PlanTask[]).map((task, index) => (
                            <div key={index} className="hover-lift bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">{task.duration}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}

      {planHistory.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Planner history</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Previously generated roadmaps</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Reload any earlier plan and continue from where you left off.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {planHistory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setTopic(entry.topic);
                  setScope(entry.scope);
                  setDuration(entry.duration);
                  setPlan(entry.tasks);
                  setShowCalendarPrompt(false);
                  setHasSavedPlanToCalendar(false);
                }}
                className="hover-lift rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{entry.topic}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {entry.duration} days
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {entry.scope || 'Strong beginner fundamentals first'}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  {entry.tasks.length} task{entry.tasks.length === 1 ? '' : 's'} saved
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !plan && (
        <div className="hover-lift text-center py-10 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="text-xl font-semibold mt-4">Ready to build your study habit?</h3>
            <p className="text-slate-500 mt-2">Enter a topic, your target scope, and duration to generate a beginner-friendly learning path from scratch.</p>
          </div>
      )}
    </div>
  );
};

export default Planner;
