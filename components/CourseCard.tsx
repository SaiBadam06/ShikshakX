import React from 'react';
import type { Course } from '../types';
import { ArrowUpRightIcon } from '@heroicons/react/24/solid';

const CourseCard: React.FC<{ course: Course }> = ({ course }) => (
  <div
    onClick={() => course.url !== '#' && window.open(course.url, '_blank', 'noopener,noreferrer')}
    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group flex flex-col h-full ${course.url !== '#' ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <div className="relative">
      <img className="w-full h-40 object-cover" src={course.coverImage} alt={course.title} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
    </div>
    <div className="p-6 flex-1 flex flex-col">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{course.title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 flex-1 mb-4">{course.description}</p>
      <div className="flex justify-between items-center mt-auto">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">by {course.instructor}</p>
        {course.url !== '#' && (
            <div className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                View <ArrowUpRightIcon className="h-4 w-4 ml-1" />
            </div>
        )}
      </div>
    </div>
  </div>
);

export default CourseCard;
