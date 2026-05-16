import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, BeakerIcon, CheckCircleIcon, ClipboardDocumentListIcon, CalendarIcon, BoltIcon, BuildingLibraryIcon, PencilIcon, ArrowRightOnRectangleIcon, UserGroupIcon, SparklesIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { toast } from './Toast';
import ThemeToggle from './ThemeToggle';
import { subscribeToUserProfile } from '../services/communityService';
import type { AppUserProfile } from '../types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Courses', href: '/courses', icon: BookOpenIcon },
  { name: 'Q & A', href: '/qa', icon: BeakerIcon },
  { name: 'Assessments', href: '/assessments', icon: CheckCircleIcon },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Planner', href: '/planner', icon: CalendarIcon },
  { name: 'Summarize', href: '/summarize', icon: BoltIcon },
  { name: 'Materials', href: '/materials', icon: BuildingLibraryIcon },
  { name: 'Notes', href: '/notes', icon: PencilIcon },
  { name: 'Community', href: '/community', icon: UserGroupIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  user: User;
  theme: 'day' | 'dark';
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, theme, onToggleTheme, isOpen, onClose }) => {
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const linkClasses = "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200";
  const inactiveClasses = "text-slate-500 hover:bg-white/80 hover:text-slate-900";
  const activeClasses = "bg-white text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80";

  useEffect(() => {
    const unsubscribe = subscribeToUserProfile(user.uid, setProfile);
    return () => unsubscribe();
  }, [user.uid]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener in App.tsx will handle redirecting to /login
      toast.success("You have been signed out.");
    } catch (error) {
      toast.error("Failed to sign out.");
      console.error("Sign out error:", error);
    }
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-[290px] transform transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="mb-6 rounded-[1.6rem] brand-surface px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">ShikshakX</h1>
              <p className="mt-1 text-sm text-white/80">A calmer, smarter learning workspace.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-100 transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Close navigation"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Appearance</p>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} className="border-white/20 bg-white/10 text-white hover:bg-white/16" />
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeClasses : inactiveClasses}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${item.name === 'Dashboard' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80'}`}>
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span>{item.name}</span>
          </NavLink>
        ))}
        </nav>

        <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4">
          <div className="mb-4 flex items-center gap-3">
            <img
              src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || user.displayName || 'User')}&background=random`}
              alt="User avatar"
              className="h-12 w-12 rounded-2xl object-cover shadow-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{profile?.displayName || user.displayName || 'Student'}</p>
              <p className="truncate text-xs text-slate-500">{profile?.email || user.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="app-button-secondary w-full px-4 py-3 text-sm">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
