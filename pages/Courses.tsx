import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Course } from '../types';
import CourseCard from '../components/CourseCard';
import type { User } from 'firebase/auth';

interface CoursesProps {
  user: User;
}

const Courses: React.FC<CoursesProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const coursesCollectionRef = collection(db, 'users', user.uid, 'courses');
      const q = query(coursesCollectionRef, orderBy("title"));
      const querySnapshot = await getDocs(q);
      const coursesData = querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))) as Course[];
      setCourses(coursesData);
      setLoading(false);
    };
    fetchCourses();
  }, [user.uid]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-extrabold mb-2 text-slate-900 dark:text-white">All Courses</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Explore these recommended courses and materials to build your skills.</p>
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg h-96 animate-pulse">
                    <div className="w-full h-40 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="p-6">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
