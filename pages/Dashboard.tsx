import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit, orderBy, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Course, Task, Note } from '../types';
import type { User } from 'firebase/auth';
import CourseCard from '../components/CourseCard';
import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon, 
  PencilIcon 
} from '@heroicons/react/24/solid';
import { useAuth } from '../hooks/useAuth';

interface DashboardProps {
    user: User;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4">
        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
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
            if (!user || !user.uid) {
                console.error('No user authenticated');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const userDocRef = doc(db, 'users', user.uid);

                // Fetch Courses
                try {
                    const coursesQuery = query(collection(userDocRef, 'courses'), limit(6));
                    const coursesSnapshot = await getDocs(coursesQuery);
                    console.log('Fetched courses:', coursesSnapshot.docs.length);
                    setCourses(coursesSnapshot.docs.map(d => ({
                        id: d.id,
                        title: d.data().title || 'Untitled Course',
                        description: d.data().description || 'No description',
                        instructor: d.data().instructor || 'Instructor',
                        coverImage: d.data().coverImage || 'https://via.placeholder.com/300x200',
                        url: d.data().url || '#',
                        ...d.data()
                    } as Course)));
                } catch (error) {
                    console.error('Error fetching courses:', error);
                    setCourses([]);
                }

                // Fetch Upcoming Tasks
                try {
                    const tasksQuery = query(
                        collection(userDocRef, 'tasks'),
                        where('completed', '==', false),
                        orderBy('dueDate', 'asc'),
                        limit(3)
                    );
                    const tasksSnapshot = await getDocs(tasksQuery);
                    console.log('Fetched tasks:', tasksSnapshot.docs.length);
                    setTasks(tasksSnapshot.docs.map(d => {
                        const data = d.data();
                        return {
                            id: d.id,
                            title: data.title || 'Untitled Task',
                            description: data.description || '',
                            dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : new Date(),
                            completed: data.completed || false,
                            ...data
                        } as Task;
                    }));
                } catch (error) {
                    console.error('Error fetching tasks:', error);
                    setTasks([]);
                }

                // Fetch Recent Notes (with fallback to empty array if no notes)
                try {
                    const notesQuery = query(
                        collection(userDocRef, 'notes'), 
                        orderBy('createdAt', 'desc'), 
                        limit(2)
                    );
                    const notesSnapshot = await getDocs(notesQuery);
                    console.log('Fetched notes:', notesSnapshot.docs.length);
                    setNotes(notesSnapshot.docs.map(d => {
                        const data = d.data();
                        return {
                            id: d.id,
                            title: data.title || 'Untitled Note',
                            content: data.content || '',
                            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                            ...data
                        } as Note;
                    }));
                } catch (error) {
                    console.error('Error fetching notes:', error);
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

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Welcome back, {user.displayName?.split(' ')[0] || 'Student'}!</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Let's continue your learning journey.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Enrolled Courses" value={courses.length} icon={BookOpenIcon} />
                <StatCard title="Upcoming Tasks" value={tasks.length} icon={ClipboardDocumentListIcon} />
                <StatCard title="Notes Created" value={notes.length} icon={PencilIcon} />
            </div>

            <div className="space-y-8">
                {/* Courses Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Continue Learning</h2>
                        <Link to="/courses" className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            View All <ArrowRightIcon className="h-4 w-4 ml-1" />
                        </Link>
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : courses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.slice(0, 3).map(course => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
                            <BookOpenIcon className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600" />
                            <p className="mt-4 text-slate-500">No courses found. Start by adding your first course!</p>
                            <Link to="/courses" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Add Course
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tasks Section */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upcoming Tasks</h2>
                            <Link to="/tasks" className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                View All <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                                    ))}
                                </div>
                            ) : tasks.length > 0 ? (
                                <div className="space-y-4">
                                    {tasks.map(task => (
                                        <div key={task.id} className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition-colors">
                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mr-4 flex-shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-white truncate">{task.title}</p>
                                                {task.description && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{task.description}</p>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap ml-4">
                                                {task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-slate-500">No upcoming tasks. Great job!</p>
                                    <Link to="/tasks" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                        Create Task
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Notes</h2>
                            <Link to="/notes" className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                View All <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                [1, 2].map((i) => (
                                    <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                                ))
                            ) : notes.length > 0 ? (
                                notes.map(note => (
                                    <Link 
                                        to={`/notes/${note.id}`} 
                                        key={note.id} 
                                        className="block bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 p-4 rounded-lg transition-colors border border-yellow-100 dark:border-yellow-900/50"
                                    >
                                        <h4 className="font-bold text-yellow-900 dark:text-yellow-200 truncate">{note.title}</h4>
                                        <p className="text-sm text-yellow-800/80 dark:text-yellow-300/80 line-clamp-2 mt-1">
                                            {note.content}
                                        </p>
                                        <p className="text-xs text-yellow-700/60 dark:text-yellow-400/60 mt-2">
                                            {new Date(note.createdAt).toLocaleDateString()}
                                        </p>
                                    </Link>
                                ))
                            ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 text-center">
                                    <PencilIcon className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-slate-500">No notes yet</p>
                                    <Link to="/notes/new" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                                        Create Note
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
