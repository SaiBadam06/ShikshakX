import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import QA from './pages/QA';
import Assessments from './pages/Assessments';
import Tasks from './pages/Tasks';
import Planner from './pages/Planner';
import Summarize from './pages/Summarize';
import Materials from './pages/Materials';
import Notes from './pages/Notes';
import Community from './pages/Community';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Landing from './pages/Landing';
import { seedInitialData } from './services/firebaseService';
import { ToastContainer, toast } from './components/Toast';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { Bars3Icon, SparklesIcon } from '@heroicons/react/24/outline';
import PageErrorBoundary from './components/PageErrorBoundary';
import { ensurePublicCommunity, ensureUserProfile } from './services/communityService';
import ThemeToggle from './components/ThemeToggle';

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <div className="app-shell flex min-h-screen items-center justify-center px-6">
    <div className="app-panel-strong hero-gradient w-full max-w-xl p-10 text-center">
      <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-950 text-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
        <SparklesIcon className="h-8 w-8" />
      </div>
      <svg className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">ShikshakX</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{message}</p>
    </div>
  </div>
);

const AppLayout: React.FC<{ user: User; theme: 'day' | 'dark'; onToggleTheme: () => void }> = ({ user, theme, onToggleTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
        />
      )}

      <div className="relative min-h-screen md:pl-[302px]">
        <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/70 bg-white/72 px-4 py-4 backdrop-blur-xl md:hidden">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">ShikshakX</p>
              <p className="text-sm text-slate-500">Learning, beautifully organized</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-sm"
                aria-label="Open navigation"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>
          </header>
          <main className="app-main">
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'day' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'day';
    }

    return (localStorage.getItem('shikshakx-theme') as 'day' | 'dark') || 'day';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.dataset.theme = theme;
    localStorage.setItem('shikshakx-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'day' ? 'dark' : 'day'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User is signed in. Seed data if they are new.
        setLoading(true);
        try {
          await ensureUserProfile(currentUser);
          await ensurePublicCommunity();
          await seedInitialData(currentUser.uid);
        } catch (error: any) {
          console.error("Error during initial data seeding:", error);
          toast.error(`Setup error: ${error.message}`);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner message={user ? "Setting up your learning environment..." : "Authenticating..."} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/" replace />} />
        {!user ? (
          <>
            <Route path="/" element={<Landing theme={theme} onToggleTheme={toggleTheme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route element={<AppLayout user={user} theme={theme} onToggleTheme={toggleTheme} />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/courses" element={<Courses user={user} />} />
            <Route path="/qa" element={<QA user={user} />} />
            <Route path="/assessments" element={<Assessments user={user} />} />
            <Route path="/tasks" element={<Tasks user={user} />} />
            <Route path="/planner" element={<Planner user={user} />} />
            <Route path="/summarize" element={<Summarize user={user} />} />
            <Route path="/materials" element={<Materials user={user} />} />
            <Route path="/notes" element={<Notes user={user} />} />
            <Route path="/community" element={<Community user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        )}
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
};

export default App;
