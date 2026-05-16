import React from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  theme: 'day' | 'dark';
  onToggle: () => void;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, className = '' }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/78 px-4 py-2 text-sm font-bold text-slate-800 shadow-[0_14px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white ${className}`}
      aria-label={isDark ? 'Switch to day mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      {isDark ? 'Day' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
