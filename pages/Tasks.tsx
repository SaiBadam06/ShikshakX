import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Task } from '../types';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { PlusIcon, CalendarIcon, CheckIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { initGoogleCalendar, handleAuthClick, handleSignoutClick, createCalendarEvent, GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../services/calendarClient';
import type { User } from 'firebase/auth';
import GoogleCalendarConfigBanner from '../components/GoogleCalendarConfigBanner';

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

  const isGcalConfigured = !GOOGLE_API_KEY.startsWith("YOUR_") && !GOOGLE_CLIENT_ID.startsWith("YOUR_");

  useEffect(() => {
    if (isGcalConfigured) {
        initGoogleCalendar(setIsGcalAuthorized);
    }
  }, [isGcalConfigured]);

  useEffect(() => {
    const userTasksCollection = collection(db, 'users', user.uid, 'tasks');
    const q = query(userTasksCollection, orderBy('dueDate', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let dueDate = data.dueDate;
        if (dueDate && typeof dueDate.seconds === 'number') {
            dueDate = new Timestamp(dueDate.seconds, dueDate.nanoseconds).toDate();
        } else if (dueDate) {
            dueDate = new Date(dueDate);
        } else {
            dueDate = new Date();
        }

        tasksData.push({ 
          id: doc.id, 
          ...data,
          dueDate,
        } as Task);
      });
      setTasks(tasksData);
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
    const taskData = {
      title: newTaskTitle,
      description: newTaskDesc,
      dueDate: new Date(newTaskDueDate),
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
    const taskRef = doc(db, 'users', user.uid, 'tasks', task.id);
    await updateDoc(taskRef, { completed: !task.completed });
    toast.info(`Task "${task.title}" marked as ${!task.completed ? 'complete' : 'incomplete'}.`);
  };

  const deleteTask = async (taskId: string) => {
    if(window.confirm("Are you sure you want to delete this task?")) {
        const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
        await deleteDoc(taskRef);
        toast.success('Task deleted.');
    }
  };

  const gcalAuthCallback = useCallback(() => {
      initGoogleCalendar(setIsGcalAuthorized);
  }, []);

  return (
    <div>
      <GoogleCalendarConfigBanner />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Tasks</h1>
        <div className="flex items-center space-x-4">
          {isGcalConfigured && (
            isGcalAuthorized ? (
                <button onClick={() => handleSignoutClick(gcalAuthCallback)} className="flex items-center text-sm bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors">
                <CalendarIcon className="h-5 w-5 mr-2"/>Disconnect Calendar
                </button>
            ) : (
                <button onClick={handleAuthClick} className="flex items-center text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                <CalendarIcon className="h-5 w-5 mr-2"/>Connect Google Calendar
                </button>
            )
          )}
          {!isGcalConfigured && (
             <div className="relative">
                <button 
                    className="flex items-center text-sm bg-slate-200 text-slate-500 px-3 py-2 rounded-lg cursor-not-allowed"
                    disabled
                    title="Google Calendar is not configured. Please see README.md for setup instructions."
                >
                    <CalendarIcon className="h-5 w-5 mr-2"/>Connect Google Calendar
                </button>
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 space-y-3">
        {tasks.map(task => (
          <div key={task.id} className={`flex items-center p-3 rounded-lg transition-colors ${task.completed ? 'bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <button onClick={() => toggleTaskCompletion(task)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-4 transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500'}`}>
              {task.completed && <CheckIcon className="h-4 w-4 text-white" />}
            </button>
            <div className="flex-1">
              <p className={`font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>{task.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{task.dueDate.toLocaleDateString()}</p>
            </div>
            <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-center text-slate-500 py-4">No tasks yet. Add one to get started!</p>}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add New Task">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Title</label>
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Description</label>
            <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" rows={3}></textarea>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Due Date</label>
            <input type="datetime-local" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" required />
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
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;