import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { PlanTask } from '../types';
import { toast } from '../components/Toast';
import { initGoogleCalendar, handleAuthClick, createCalendarEvent, GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../services/calendarClient';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';

interface PlannerProps {
  user: User;
}

const Planner: React.FC<PlannerProps> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(7);
  const [plan, setPlan] = useState<PlanTask[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGcalAuthorized, setIsGcalAuthorized] = useState(false);

  const isGcalConfigured = !GOOGLE_API_KEY.startsWith("YOUR_") && !GOOGLE_CLIENT_ID.startsWith("YOUR_");

  useEffect(() => {
    if (isGcalConfigured) {
      initGoogleCalendar(setIsGcalAuthorized);
    }
  }, [isGcalConfigured]);

  const handleGeneratePlan = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to plan.');
      return;
    }
    setError('');
    setIsLoading(true);
    setPlan(null);
    try {
      const result = await apiClient.generatePlan(topic, duration);
      setPlan(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCalendar = async (task: PlanTask) => {
    if (!isGcalAuthorized) {
        toast.info("Please connect Google Calendar first!");
        handleAuthClick();
        return;
    }
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + task.day - 1);
    eventDate.setHours(9, 0, 0, 0); // Default to 9 AM

    try {
        await createCalendarEvent({
            title: task.title,
            description: task.description,
            dueDate: eventDate,
        });
        toast.success(`'${task.title}' added to your calendar!`);
    } catch (e) {
        toast.error('Failed to add event to calendar.');
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
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
            {Object.entries(groupedPlan).map(([day, tasks]) => (
                <div key={day}>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 pb-2 mb-4 border-b-2 border-gray-200 dark:border-gray-700">{day}</h2>
                    <div className="space-y-3">
                        {/* FIX: Cast tasks to PlanTask[] as Object.entries may return 'unknown' for values. */}
                        {(tasks as PlanTask[]).map((task, index) => (
                            <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">{task.duration}</p>
                                </div>
                                <button onClick={() => handleAddToCalendar(task)} className="flex-shrink-0 flex items-center text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors" title="Add to Google Calendar">
                                    <PlusIcon className="h-4 w-4 mr-2" /> Add to Calendar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}

      {!isLoading && !plan && (
        <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="text-xl font-semibold mt-4">Ready to build your study habit?</h3>
            <p className="text-slate-500 mt-2">Enter a topic and duration above to generate a personalized learning path.</p>
          </div>
      )}
    </div>
  );
};

export default Planner;