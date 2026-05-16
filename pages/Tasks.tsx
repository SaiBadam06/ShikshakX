import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Task } from '../types';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { PlusIcon, CalendarIcon, CheckIcon, TrashIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { initGoogleCalendar, handleAuthClick, handleSignoutClick, createCalendarEvent, hasGoogleCalendarLoaded, isGoogleCalendarConfigured } from '../services/calendarClient';
import type { User } from 'firebase/auth';
import GoogleCalendarConfigBanner from '../components/GoogleCalendarConfigBanner';
import { formatDate, formatTime } from '../utils/date';

interface TasksProps {
  user: User;
}

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isGcalAuthorized, setIsGcalAuthorized] = useState(false);
  const [syncToGcal, setSyncToGcal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [calendarInitError, setCalendarInitError] = useState('');
  const [isCalendarReady, setIsCalendarReady] = useState(!isGoogleCalendarConfigured);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'missed' | 'completed_on_time' | 'completed_late'>('all');

  const isGcalConfigured = isGoogleCalendarConfigured;
  const now = Date.now();
  const calendarStatus = !isGcalConfigured
    ? 'Google Calendar is not configured in your .env file yet.'
    : isGcalAuthorized
      ? 'Google Calendar is connected and ready.'
      : isCalendarReady
        ? 'Google Calendar is ready. Connect it to sync new tasks.'
        : 'Google Calendar is loading its client. Please wait a moment.';
  const matchesTaskSearch = (task: Task) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return [task.title, task.description || ''].some((value) => value.toLowerCase().includes(normalizedQuery));
  };

  const baseMissedTasks = tasks.filter((task) => !task.completed && task.dueDate.getTime() < now);
  const baseActiveTasks = tasks.filter((task) => !task.completed && task.dueDate.getTime() >= now);
  const baseCompletedOnTimeTasks = tasks.filter((task) => {
    const completedAtTime = task.completedAt instanceof Date ? task.completedAt.getTime() : null;
    return task.completed && (!!completedAtTime ? completedAtTime <= task.dueDate.getTime() : true);
  });
  const baseCompletedLateTasks = tasks.filter((task) => {
    const completedAtTime = task.completedAt instanceof Date ? task.completedAt.getTime() : null;
    return task.completed && !!completedAtTime && completedAtTime > task.dueDate.getTime();
  });
  const matchesStatusFilter = (statusKey: 'active' | 'missed' | 'completed_on_time' | 'completed_late') =>
    statusFilter === 'all' || statusFilter === statusKey;

  const missedTasks = baseMissedTasks.filter((task) => matchesTaskSearch(task) && matchesStatusFilter('missed'));
  const activeTasks = baseActiveTasks.filter((task) => matchesTaskSearch(task) && matchesStatusFilter('active'));
  const completedOnTimeTasks = baseCompletedOnTimeTasks.filter((task) => matchesTaskSearch(task) && matchesStatusFilter('completed_on_time'));
  const completedLateTasks = baseCompletedLateTasks.filter((task) => matchesTaskSearch(task) && matchesStatusFilter('completed_late'));
  const completedTasks = [...completedOnTimeTasks, ...completedLateTasks];

  useEffect(() => {
    if (isGcalConfigured) {
      let isMounted = true;

      (async () => {
        try {
          const ready = await initGoogleCalendar((authorized) => {
            if (isMounted) {
              setIsGcalAuthorized(authorized);
            }
          });
          if (isMounted) {
            setIsCalendarReady(ready && hasGoogleCalendarLoaded());
            setCalendarInitError(ready ? '' : 'Calendar connection is unavailable right now.');
          }
        } catch (error) {
          console.error('Google Calendar initialization failed:', error);
          if (isMounted) {
            setCalendarInitError('Calendar connection is unavailable right now.');
            setIsGcalAuthorized(false);
            setIsCalendarReady(false);
          }
        }
      })();

      return () => {
        isMounted = false;
      };
    }
  }, [isGcalConfigured]);

  useEffect(() => {
    const userTasksCollection = collection(db, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(userTasksCollection, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((snapshot) => {
        const data = snapshot.data();
        
        let dueDate = data.dueDate;
        let completedAt = data.completedAt ?? null;
        if (dueDate && typeof dueDate.seconds === 'number') {
            dueDate = new Timestamp(dueDate.seconds, dueDate.nanoseconds).toDate();
        } else if (dueDate) {
            dueDate = new Date(dueDate);
        } else {
            dueDate = new Date();
        }

        if (completedAt && typeof completedAt.seconds === 'number') {
          completedAt = new Timestamp(completedAt.seconds, completedAt.nanoseconds).toDate();
        } else if (completedAt) {
          completedAt = new Date(completedAt);
        } else {
          completedAt = null;
        }

        tasksData.push({ 
          id: snapshot.id, 
          ...data,
          dueDate,
          completedAt,
        } as Task);
      });

      tasksData.sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
      setTasks(tasksData);
      setLoadError('');
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading tasks:', error);
      setLoadError('We could not load your tasks right now. Please refresh and try again.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const resetForm = useCallback(() => {
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate('');
    setSyncToGcal(false);
  }, []);
  
  const handleCloseModal = () => {
      resetForm();
      setIsModalOpen(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) return;
    
    setIsSubmitting(true);
    const parsedDate = new Date(newTaskDueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error('Please choose a valid due date.');
      setIsSubmitting(false);
      return;
    }

    const taskData = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      dueDate: parsedDate,
      completed: false
    };

    try {
      const userTasksCollection = collection(db, 'users', user.uid, 'tasks');
      await addDoc(userTasksCollection, taskData);
      
      if (syncToGcal && isGcalAuthorized) {
        try {
          await createCalendarEvent(taskData);
          toast.success('Task added and synced to Google Calendar!');
        } catch (gcalError) {
          console.error("Google Calendar sync error:", gcalError);
          toast.error('Task added, but failed to sync to Calendar.');
        }
      } else {
        toast.success('Task added successfully!');
      }
      
      handleCloseModal();

    } catch (error) {
      console.error("Error adding task: ", error);
      toast.error('Failed to add task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', task.id);
      await updateDoc(taskRef, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : null,
      });
      toast.info(`Task "${task.title}" marked as ${!task.completed ? 'complete' : 'incomplete'}.`);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('We could not update that task.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if(window.confirm("Are you sure you want to delete this task?")) {
        try {
          const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
          await deleteDoc(taskRef);
          toast.success('Task deleted.');
        } catch (error) {
          console.error('Error deleting task:', error);
          toast.error('We could not delete that task.');
        }
    }
  };

  const gcalAuthCallback = useCallback(() => {
      (async () => {
        try {
          const ready = await initGoogleCalendar(setIsGcalAuthorized);
          setIsCalendarReady(ready && hasGoogleCalendarLoaded());
          setCalendarInitError(ready ? '' : 'Calendar connection is unavailable right now.');
        } catch (error) {
          console.error('Google Calendar re-initialization failed:', error);
          setCalendarInitError('Calendar connection is unavailable right now.');
          setIsCalendarReady(false);
        }
      })();
  }, []);

  const handleConnectCalendar = async () => {
    try {
      if (!isCalendarReady) {
        toast.info('Google Calendar is still loading. Please try again in a moment.');
        return;
      }
      const authorized = await handleAuthClick();
      setIsGcalAuthorized(authorized);
      setCalendarInitError('');
      if (!authorized) {
        toast.info('Google Calendar sign-in was cancelled or not completed.');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setCalendarInitError('Calendar connection is unavailable right now.');
      toast.error('Google Calendar is unavailable right now.');
    }
  };

  const taskSections = [
    {
      key: 'active',
      title: 'Active',
      caption: 'Upcoming tasks you can still finish on time.',
      tasks: activeTasks,
      sectionClass: 'border-blue-200/70 bg-blue-50/70',
      titleClass: 'text-blue-700',
      textClass: 'text-blue-700/80',
      badgeClass: 'bg-blue-100 text-blue-700',
      itemClass: 'border-blue-200 bg-blue-50/60',
      checkboxClass: 'border-blue-300 bg-white hover:border-blue-500',
      taskTitleClass: 'text-slate-900',
    },
    {
      key: 'missed',
      title: 'Missed',
      caption: 'Overdue tasks that still need attention.',
      tasks: missedTasks,
      sectionClass: 'border-amber-200/70 bg-amber-50/80',
      titleClass: 'text-amber-700',
      textClass: 'text-amber-700/80',
      badgeClass: 'bg-amber-100 text-amber-700',
      itemClass: 'border-amber-200 bg-amber-50/70',
      checkboxClass: 'border-amber-400 bg-white hover:border-amber-500',
      taskTitleClass: 'text-amber-800',
    },
    {
      key: 'completed',
      title: 'Completed On Time',
      caption: 'Finished before the deadline.',
      tasks: completedOnTimeTasks,
      sectionClass: 'border-emerald-200/70 bg-emerald-50/80',
      titleClass: 'text-emerald-700',
      textClass: 'text-emerald-700/80',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      itemClass: 'border-emerald-200 bg-emerald-50/70',
      checkboxClass: 'bg-emerald-500 border-emerald-500',
      taskTitleClass: 'line-through text-emerald-700',
    },
    {
      key: 'late',
      title: 'Completed Late',
      caption: 'Finished after the due date passed.',
      tasks: completedLateTasks,
      sectionClass: 'border-rose-200/70 bg-rose-50/80',
      titleClass: 'text-rose-700',
      textClass: 'text-rose-700/80',
      badgeClass: 'bg-rose-100 text-rose-700',
      itemClass: 'border-rose-200 bg-rose-50/70',
      checkboxClass: 'bg-rose-500 border-rose-500',
      taskTitleClass: 'line-through text-rose-700',
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <GoogleCalendarConfigBanner />
      <div className="app-panel-strong hero-gradient flex flex-col gap-6 rounded-[2rem] p-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="page-eyebrow mb-5">
            <CalendarIcon className="h-4 w-4" />
            Tasks and deadlines
          </div>
          <h1 className="page-title text-slate-950">Keep your next moves visible.</h1>
          <p className="page-copy mt-4 max-w-2xl text-lg">Track due dates, check things off, and optionally mirror them into Google Calendar.</p>
        </div>
        <div className="flex items-center space-x-4">
          {isGcalConfigured && (
            isGcalAuthorized ? (
                <button onClick={() => handleSignoutClick(gcalAuthCallback)} className="app-button-secondary px-4 py-3 text-sm text-red-700">
                <CalendarIcon className="h-5 w-5"/>Disconnect Calendar
                </button>
            ) : (
                <button onClick={handleConnectCalendar} disabled={!isCalendarReady} className="app-button-secondary px-4 py-3 text-sm disabled:cursor-wait disabled:opacity-60">
                <CalendarIcon className="h-5 w-5"/>{isCalendarReady ? 'Connect Calendar' : 'Preparing Calendar...'}
                </button>
            )
          )}
          {!isGcalConfigured && (
             <div className="relative">
                <button 
                    className="app-button-secondary cursor-not-allowed px-4 py-3 text-sm text-slate-500"
                    disabled
                    title="Google Calendar is not configured. Please see README.md for setup instructions."
                >
                    <CalendarIcon className="h-5 w-5"/>Connect Calendar
                </button>
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="app-button-primary px-4 py-3 text-sm"
          >
            <PlusIcon className="h-5 w-5" />
            Add Task
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-panel rounded-[1.5rem] border border-blue-200/70 bg-blue-50/80 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Active</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-blue-800">{activeTasks.length}</p>
          <p className="mt-2 text-sm text-blue-700/80">Tasks still waiting to be finished on time.</p>
        </div>
        <div className="app-panel rounded-[1.5rem] border border-amber-200/70 bg-amber-50/80 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Missed</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-amber-800">{missedTasks.length}</p>
          <p className="mt-2 text-sm text-amber-700/80">Overdue tasks that still need attention.</p>
        </div>
        <div className="app-panel rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/80 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Completed On Time</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-700">{completedOnTimeTasks.length}</p>
          <p className="mt-2 text-sm text-emerald-700/80">Finished before the deadline.</p>
        </div>
        <div className="app-panel rounded-[1.5rem] border border-rose-200/70 bg-rose-50/80 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Completed Late</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-rose-700">{completedLateTasks.length}</p>
          <p className="mt-2 text-sm text-rose-700/80">Finished after the due date passed.</p>
        </div>
      </div>

      <div className={`rounded-[1.35rem] px-4 py-3 text-sm ${
        isGcalAuthorized
          ? 'bg-emerald-50 text-emerald-700'
          : isGcalConfigured
            ? 'bg-sky-50 text-sky-700'
            : 'bg-amber-50 text-amber-700'
      }`}>
        {calendarStatus}
      </div>

      <div className="app-panel rounded-[1.6rem] p-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.9fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Search tasks</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title or description"
              className="app-input px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Filter by status</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="app-input px-4 py-3 text-sm">
              <option value="all">All sections</option>
              <option value="active">Active</option>
              <option value="missed">Missed</option>
              <option value="completed_on_time">Completed on time</option>
              <option value="completed_late">Completed late</option>
            </select>
          </div>
        </div>
      </div>

      <div className="app-panel rounded-[1.75rem] p-4 space-y-5">
        {loadError && (
          <div className="rounded-[1.35rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        {calendarInitError && (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {calendarInitError}
          </div>
        )}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-[1.35rem] bg-slate-100"></div>
            ))}
          </div>
        )}
        {!isLoading && taskSections.map((section) => (
          <section key={section.key} className={`rounded-[1.5rem] border p-4 ${section.sectionClass}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${section.titleClass}`}>{section.title}</p>
                <p className={`mt-1 text-sm ${section.textClass}`}>{section.caption}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${section.badgeClass}`}>
                {section.tasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {section.tasks.length > 0 ? section.tasks.map((task) => (
                <div key={task.id} className={`flex items-center p-4 rounded-[1.35rem] border transition-colors ${section.itemClass}`}>
                  <button onClick={() => toggleTaskCompletion(task)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-4 transition-all ${section.checkboxClass}`}>
                    {task.completed && <CheckIcon className="h-4 w-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold ${section.taskTitleClass}`}>{task.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${section.badgeClass}`}>
                        {section.title}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatDate(task.dueDate)} {formatTime(task.dueDate)}
                      </span>
                      {task.description && <span className="truncate">{task.description}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )) : (
                <div className="rounded-[1.25rem] bg-white/60 px-4 py-5 text-sm text-slate-500">
                  {searchQuery.trim() || statusFilter !== 'all'
                    ? 'No tasks match the current search or filter.'
                    : 'No tasks in this section yet.'}
                </div>
              )}
            </div>
          </section>
        ))}
        {!isLoading && tasks.length === 0 && (
          <div className="rounded-[1.35rem] bg-slate-50 px-5 py-8 text-center">
            <CalendarIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-lg font-bold text-slate-900">No tasks yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Add one deadline or action item and it will show up here immediately.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add New Task">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="app-input px-4 py-3 text-sm" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
            <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="app-input w-full px-4 py-3 text-sm leading-6" rows={3}></textarea>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Due Date</label>
            <input type="datetime-local" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="app-input px-4 py-3 text-sm" required />
          </div>
          {isGcalAuthorized && isGcalConfigured ? (
              <div className="flex items-center">
                  <input type="checkbox" id="gcal-sync" checked={syncToGcal} onChange={e => setSyncToGcal(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="gcal-sync" className="ml-2 block text-sm">Add to Google Calendar</label>
              </div>
          ) : (
             isGcalConfigured && <div className="flex items-start p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm">Connect your Google Calendar to automatically add tasks to it.</p>
             </div>
          )}
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="app-button-primary px-5 py-3 text-sm">
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
