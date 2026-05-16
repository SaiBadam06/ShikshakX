import React from 'react';
import type { Course } from '../types';
import { ArrowUpRightIcon } from '@heroicons/react/24/solid';
import { getCourseCoverImage } from '../services/courseImageService';

const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  const coverImage = getCourseCoverImage(course.title, course.coverImage);

  return (
    <article
      onClick={() => course.url !== '#' && window.open(course.url, '_blank', 'noopener,noreferrer')}
      className={`group app-panel flex h-full flex-col overflow-hidden rounded-[1.75rem] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] ${course.url !== '#' ? 'cursor-pointer' : 'cursor-default'}`}
    >
    <div className="relative">
      <img className="h-48 w-full object-cover" src={coverImage} alt={course.title} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent"></div>
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
        Course
      </div>
    </div>
    <div className="flex flex-1 flex-col p-6">
      <h3 className="mb-2 text-xl font-extrabold tracking-tight text-slate-950 transition-colors group-hover:text-blue-700">{course.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-6 text-slate-600">{course.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">by {course.instructor}</p>
        {course.url !== '#' && (
            <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 opacity-0 transition duration-300 group-hover:opacity-100">
                Open <ArrowUpRightIcon className="ml-1 h-4 w-4" />
            </div>
        )}
      </div>
    </div>
    </article>
  );
};

export default CourseCard;
