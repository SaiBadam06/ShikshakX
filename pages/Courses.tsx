import React, { useMemo, useState, useEffect } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Course } from '../types';
import CourseCard from '../components/CourseCard';
import type { User } from 'firebase/auth';
import { BookOpenIcon, LinkIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { toast } from '../components/Toast';

interface CoursesProps {
  user: User;
}

const Courses: React.FC<CoursesProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'seeded'>('all');

  useEffect(() => {
    const coursesCollectionRef = collection(db, 'users', user.uid, 'courses');
    const coursesQuery = query(coursesCollectionRef, orderBy('title'));

    const unsubscribe = onSnapshot(coursesQuery, (querySnapshot) => {
      const coursesData = querySnapshot.docs.map((courseDoc) => ({
        id: courseDoc.id,
        ...(courseDoc.data() as Omit<Course, 'id'>),
      })) as Course[];

      setCourses(coursesData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading courses:', error);
      toast.error('Could not load courses right now.');
      setLoading(true);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const addedCourses = useMemo(
    () => courses.filter((course) => course.source === 'user'),
    [courses],
  );

  const workspaceCourses = useMemo(
    () => courses.filter((course) => course.source !== 'user'),
    [courses],
  );

  const filterCourses = (courseList: Course[]) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return courseList.filter((course) => {
      const matchesQuery = !normalizedQuery || [
        course.title,
        course.description,
        course.instructor,
        course.url,
      ].some((value) => (value || '').toLowerCase().includes(normalizedQuery));

      const matchesSource = sourceFilter === 'all' || course.source === sourceFilter || (sourceFilter === 'seeded' && course.source !== 'user');
      return matchesQuery && matchesSource;
    });
  };

  const handleAddCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !url.trim()) {
      toast.error('Please add both a course title and its web link.');
      return;
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      toast.error('Please enter a valid course URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'courses'), {
        title: title.trim(),
        description: description.trim() || 'A course you added to keep your current learning path in one place.',
        instructor: provider.trim() || 'Current learning track',
        coverImage: '',
        url: normalizedUrl,
        source: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle('');
      setUrl('');
      setProvider('');
      setDescription('');
      toast.success('Course added to your library.');
    } catch (error) {
      console.error('Error adding course:', error);
      toast.error('Could not add that course right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCourseGrid = (courseList: Course[], emptyState: { title: string; body: string }) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="app-panel h-96 animate-pulse rounded-[1.75rem]">
              <div className="h-40 w-full bg-slate-200"></div>
              <div className="p-6">
                <div className="mb-4 h-4 w-3/4 rounded bg-slate-200"></div>
                <div className="mb-2 h-3 w-full rounded bg-slate-200"></div>
                <div className="h-3 w-1/2 rounded bg-slate-200"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!courseList.length) {
      return (
        <div className="app-panel rounded-[1.75rem] p-8 text-center">
          <BookOpenIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-bold text-slate-900">{emptyState.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{emptyState.body}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courseList.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <section className="app-panel-strong hero-gradient rounded-[2rem] p-8 md:p-10">
        <div className="page-eyebrow mb-5">
          <BookOpenIcon className="h-4 w-4" />
          Course library
        </div>
        <h1 className="page-title text-slate-950">Explore your learning catalog.</h1>
        <p className="page-copy mt-4 max-w-2xl text-lg">Browse the courses available in your workspace, and keep your own current web courses in one place too.</p>
      </section>

      <section className="app-panel rounded-[1.9rem] p-6 md:p-7">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_1.2fr] xl:items-start">
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
              <PlusIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Your added courses</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Add the course link you are studying right now.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Paste a learning link from Coursera, Udemy, AWS, YouTube, or any course platform you are following.
                We will keep it in your library so it is easy to jump back in.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900">
              <p className="font-semibold">What this gives you</p>
              <p className="mt-2">
                A separate section for your personal course links, while the seeded workspace catalog stays intact below.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCourse} className="grid gap-4 rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm">
            <div>
              <label htmlFor="course-title" className="mb-2 block text-sm font-semibold text-slate-700">Course title</label>
              <input
                id="course-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="AWS Cloud Practitioner"
                className="app-input px-4 py-3 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="course-url" className="mb-2 block text-sm font-semibold text-slate-700">Course web link</label>
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="course-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://explore.skillbuilder.aws/..."
                  className="app-input pl-12 pr-4 py-3 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="course-provider" className="mb-2 block text-sm font-semibold text-slate-700">Provider</label>
                <input
                  id="course-provider"
                  type="text"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  placeholder="AWS Skill Builder"
                  className="app-input px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="course-description" className="mb-2 block text-sm font-semibold text-slate-700">Short note</label>
                <input
                  id="course-description"
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Foundation prep for the certification"
                  className="app-input px-4 py-3 text-sm"
                />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="app-button-primary mt-2 w-full justify-center px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Adding course...' : 'Add to your courses'}
            </button>
          </form>
        </div>
      </section>

      <section className="app-panel rounded-[1.6rem] p-5">
        <div className="grid gap-4 md:grid-cols-[1.3fr_0.9fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Search courses</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, provider, description, or link"
              className="app-input px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Source</label>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'all' | 'user' | 'seeded')} className="app-input px-4 py-3 text-sm">
              <option value="all">All courses</option>
              <option value="user">Your added courses</option>
              <option value="seeded">Workspace catalog</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Your added courses</p>
            <h2 className="section-title mt-2">Courses you are currently doing</h2>
            <p className="section-copy mt-2">These are the web courses you added yourself, ready to reopen in one click.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <SparklesIcon className="h-4 w-4" />
            {addedCourses.length} added
          </div>
        </div>
        {renderCourseGrid(filterCourses(addedCourses), {
          title: 'No personal courses added yet',
          body: searchQuery.trim() || sourceFilter !== 'all'
            ? 'No added courses match the current search or filter.'
            : 'Add the link of the course you are currently following, and it will appear here.',
        })}
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Workspace catalog</p>
          <h2 className="section-title mt-2">Recommended and seeded courses</h2>
          <p className="section-copy mt-2">The broader course collection already available inside your learning workspace.</p>
        </div>
        {renderCourseGrid(filterCourses(workspaceCourses), {
          title: 'No workspace courses available',
          body: searchQuery.trim() || sourceFilter !== 'all'
            ? 'No workspace courses match the current search or filter.'
            : 'The shared course catalog is empty right now.',
        })}
      </section>
    </div>
  );
};

export default Courses;
