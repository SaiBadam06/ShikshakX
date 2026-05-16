import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit, orderBy, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Course, Task, Note } from '../types';
import type { User } from 'firebase/auth';
import CourseCard from '../components/CourseCard';
import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon, 
  PencilIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/solid';
import { formatDate, formatDateTime, toDate } from '../utils/date';

interface DashboardProps {
    user: User;
}

const StatCard: React.FC<{ title: string; value: number; caption: string; icon: React.ElementType }> = ({ title, value, caption, icon: Icon }) => (
    <div className="app-panel rounded-[1.6rem] p-5">
        <div className="mb-5 flex items-center justify-between">
            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
                <Icon className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</span>
        </div>
        <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{caption}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const userDocRef = doc(db, 'users', user.uid);
                const [coursesResult, tasksResult, notesResult] = await Promise.allSettled([
                    getDocs(query(collection(userDocRef, 'courses'), limit(6))),
                    getDocs(collection(userDocRef, 'tasks')),
                    getDocs(query(collection(userDocRef, 'notes'), orderBy('createdAt', 'desc'), limit(2))),
                ]);

                if (coursesResult.status === 'fulfilled') {
                    setCourses(coursesResult.value.docs.map(snapshot => ({
                        id: snapshot.id,
                        title: snapshot.data().title || 'Untitled Course',
                        description: snapshot.data().description || 'No description available yet.',
                        instructor: snapshot.data().instructor || 'Instructor',
                        coverImage: snapshot.data().coverImage || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
                        url: snapshot.data().url || '#',
                        ...snapshot.data()
                    } as Course)));
                } else {
                    console.error('Error fetching courses:', coursesResult.reason);
                    setCourses([]);
                }

                if (tasksResult.status === 'fulfilled') {
                    const taskData = tasksResult.value.docs.map(snapshot => {
                        const data = snapshot.data();
                        return {
                            id: snapshot.id,
                            title: data.title || 'Untitled Task',
                            description: data.description || '',
                            dueDate: toDate(data.dueDate),
                            completed: Boolean(data.completed),
                            ...data,
                        } as Task;
                    });
                    taskData.sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
                    setTasks(taskData);
                } else {
                    console.error('Error fetching tasks:', tasksResult.reason);
                    setTasks([]);
                }

                if (notesResult.status === 'fulfilled') {
                    setNotes(notesResult.value.docs.map(snapshot => {
                        const data = snapshot.data();
                        return {
                            id: snapshot.id,
                            title: data.title || 'Untitled Note',
                            content: data.content || '',
                            createdAt: toDate(data.createdAt),
                            ...data,
                        } as Note;
                    }));
                } else {
                    console.error('Error fetching notes:', notesResult.reason);
                    setNotes([]);
                }
            } catch (error) {
                console.error('Error in fetchData:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.uid]);

    const firstName = user.displayName?.split(' ')[0] || 'Student';
    const now = Date.now();
    const upcomingTasks = tasks.filter((task) => !task.completed);
    const missedTasks = upcomingTasks.filter((task) => task.dueDate.getTime() < now);
    const nextTask = upcomingTasks.find((task) => task.dueDate.getTime() >= now) || upcomingTasks[0];

    return (
        <div className="animate-fade-in space-y-8">
            <section className="app-panel-strong hero-gradient overflow-hidden p-8 md:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="page-eyebrow mb-5">
                            <SparklesIcon className="h-4 w-4" />
                            Personal dashboard
                        </div>
                        <h1 className="page-title text-slate-950">Welcome back, {firstName}.</h1>
                        <p className="page-copy mt-4 max-w-2xl text-lg">
                            Your coursework, notes, plans, and AI tools are ready. The goal today is simple:
                            keep momentum without friction.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <div className="metric-chip">
                                <span className="status-dot"></span>
                                {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="metric-chip">
                                {courses.length} active course{courses.length === 1 ? '' : 's'}
                            </div>
                            <div className="metric-chip">
                                {upcomingTasks.length} open task{upcomingTasks.length === 1 ? '' : 's'}
                            </div>
                            <div className="metric-chip">
                                {missedTasks.length} missed task{missedTasks.length === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    <div className="app-panel w-full max-w-md rounded-[1.6rem] p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Today&apos;s focus</p>
                        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                            {nextTask ? nextTask.title : 'You are all caught up'}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            {nextTask
                                ? `${nextTask.description || 'The next task in your queue is ready.'} Due ${formatDate(nextTask.dueDate)}.`
                                : 'No urgent deadlines are waiting on you right now. This is a good time to review materials or create your next study block.'}
                        </p>
                        <div className="mt-5 flex gap-3">
                            <Link to="/tasks" className="app-button-primary px-5 py-3 text-sm">
                                Open Tasks
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                            <Link to="/qa" className="app-button-secondary px-5 py-3 text-sm">
                                Ask AI
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Courses"
                    value={courses.length}
                    caption="Programs, subjects, and learning paths you can continue right away."
                    icon={BookOpenIcon}
                />
                <StatCard
                    title="Open Tasks"
                    value={upcomingTasks.length}
                    caption="Actions and due dates that still need to be completed."
                    icon={ClipboardDocumentListIcon}
                />
                <StatCard
                    title="Missed Tasks"
                    value={missedTasks.length}
                    caption="Overdue work that needs attention before it snowballs."
                    icon={ClipboardDocumentListIcon}
                />
                <StatCard
                    title="Notes"
                    value={notes.length}
                    caption="Fresh thinking captured and ready to revisit when needed."
                    icon={PencilIcon}
                />
            </div>

            <div className="grid gap-8 xl:grid-cols-[1.65fr_1fr]">
                <section className="space-y-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h2 className="section-title">Continue learning</h2>
                            <p className="section-copy mt-2">Jump back into the most relevant courses without digging through clutter.</p>
                        </div>
                        <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                            View all
                            <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="app-panel h-80 animate-pulse rounded-[1.75rem] bg-white/60"></div>
                            ))}
                        </div>
                    ) : courses.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {courses.slice(0, 3).map(course => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    ) : (
                        <div className="app-panel rounded-[1.75rem] p-8 text-center">
                            <BookOpenIcon className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-4 text-lg font-bold text-slate-900">No courses yet</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Starter content did not load, or your workspace is still empty. Add or seed courses to begin.</p>
                        </div>
                    )}
                </section>

                <div className="space-y-6">
                    <section className="app-panel rounded-[1.75rem] p-6">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="section-title">Upcoming tasks</h2>
                                <p className="section-copy mt-2">Stay ahead of your next deadlines.</p>
                            </div>
                            <Link to="/tasks" className="text-sm font-bold text-blue-700">Open</Link>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                [1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100"></div>)
                            ) : upcomingTasks.length > 0 ? (
                                upcomingTasks.slice(0, 3).map(task => {
                                    const isMissed = task.dueDate.getTime() < now;
                                    return (
                                    <div key={task.id} className={`rounded-[1.35rem] border p-4 ${isMissed ? 'border-red-200 bg-red-50/90' : 'border-slate-200/80 bg-white/90'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-950">{task.title}</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">{task.description || 'No additional details yet.'}</p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isMissed ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        {isMissed && (
                                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-red-700">Missed deadline</p>
                                        )}
                                    </div>
                                )})
                            ) : (
                                <div className="rounded-[1.35rem] bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                                    Nothing urgent is scheduled. Create a task when you want to turn plans into action.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="app-panel rounded-[1.75rem] p-6">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="section-title">Recent notes</h2>
                                <p className="section-copy mt-2">Your latest thinking, captured and easy to revisit.</p>
                            </div>
                            <Link to="/notes" className="text-sm font-bold text-blue-700">Open</Link>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                [1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100"></div>)
                            ) : notes.length > 0 ? (
                                notes.map(note => (
                                    <Link
                                        to="/notes"
                                        key={note.id}
                                        className="block rounded-[1.35rem] border border-amber-100 bg-amber-50/90 p-4 transition hover:border-amber-200 hover:bg-amber-50"
                                    >
                                        <p className="text-sm font-bold text-slate-950">{note.title}</p>
                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{note.content || 'No note body yet.'}</p>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                                            {formatDateTime(note.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </Link>
                                ))
                            ) : (
                                <div className="rounded-[1.35rem] bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                                    Capture quick thoughts, summaries, or lecture notes and they&apos;ll show up here.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="app-panel rounded-[1.75rem] p-6">
                        <div className="flex items-start gap-4">
                            <div className="brand-surface rounded-2xl p-3 text-white">
                                <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="section-title">Need a study nudge?</h2>
                                <p className="section-copy mt-2">
                                    Use Q&amp;A for grounded help from your own materials, or switch to the tutor for broader academic guidance.
                                </p>
                                <Link to="/qa" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                                    Start a conversation
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
