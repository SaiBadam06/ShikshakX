import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, BeakerIcon, CheckCircleIcon, ClipboardDocumentListIcon, CalendarIcon, BoltIcon, BuildingLibraryIcon, PencilIcon, ArrowRightOnRectangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { toast } from './Toast';

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
];

interface SidebarProps {
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const linkClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200";
  const inactiveClasses = "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700";
  const activeClasses = "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-semibold";

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
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 text-slate-800 dark:text-white flex flex-col border-r border-slate-200 dark:border-slate-700">
      <div className="h-20 flex items-center justify-center px-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold tracking-wider text-slate-900 dark:text-white">ShikshakX</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeClasses : inactiveClasses}`}
          >
            <item.icon className="h-6 w-6 mr-3" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
         <div className="flex items-center mb-4">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} alt="User avatar" className="h-10 w-10 rounded-full mr-3" />
          <div>
            <p className="font-semibold text-sm truncate">{user.displayName || 'Student'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
