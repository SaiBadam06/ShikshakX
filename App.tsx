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
import Login from './pages/Login';
import { seedInitialData } from './services/firebaseService';
import { ToastContainer, toast } from './components/Toast';
import { User, onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './services/firebase';

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">
    <div className="text-center">
      <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h1 className="text-2xl font-bold">ShikshakX</h1>
      <p>{message}</p>
    </div>
  </div>
);

const AppLayout: React.FC<{ user: User }> = ({ user }) => (
  <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
    <Sidebar user={user} />
    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <Outlet />
    </main>
  </div>
);


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User is signed in. Seed data if they are new.
        setLoading(true);
        try {
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
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          {!user ? (
            <Route path="*" element={<Navigate to="/login" replace />} />
          ) : (
            <Route element={<AppLayout user={user} />}>
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
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          )}
        </Routes>
        <ToastContainer />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
