import React from 'react';
import { Link } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup } from '../services/firebase';
import { toast } from '../components/Toast';
import ConfigErrorBanner from '../components/ConfigErrorBanner';
import { ArrowRightIcon, SparklesIcon, BookOpenIcon, BoltIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';

interface LoginProps {
  theme: 'day' | 'dark';
  onToggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ theme, onToggleTheme }) => {

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in App.tsx will handle the redirect upon successful sign-in
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
          toast.error("Sign-in failed: This domain is not authorized. Please add 'localhost' to your Firebase project's authorized domains. See the README.md for instructions.");
      } else {
          toast.error(`Sign-in failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-5 py-6 md:px-8 md:py-8">
      <div className="mesh-orb mesh-orb-one" />
      <div className="mesh-orb mesh-orb-two" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="app-button-secondary px-4 py-2.5 text-sm">
              Back Home
            </Link>
            <p className="text-sm text-slate-500">Secure Google sign-in for your learning workspace</p>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </header>

        <div className="grid w-full gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <section className="app-panel-strong hero-gradient relative overflow-hidden p-8 md:p-12 stagger-rise">
          <div className="page-eyebrow mb-6">
            <SparklesIcon className="h-4 w-4" />
            Learning, beautifully organized
          </div>
          <h1 className="page-title max-w-3xl text-slate-950">
            A calmer study space for courses, notes, tasks, and AI support.
          </h1>
          <p className="page-copy mt-6 max-w-2xl text-lg">
            ShikshakX brings your academic workflow into one polished workspace so you can think clearly, move faster,
            and stay connected to what matters most in your learning journey.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="app-panel rounded-[1.5rem] p-4 stagger-rise stagger-delay-1">
              <BookOpenIcon className="h-6 w-6 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-900">Course-ready</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Keep materials, notes, and progress in one place.</p>
            </div>
            <div className="app-panel rounded-[1.5rem] p-4 stagger-rise stagger-delay-2">
              <BoltIcon className="h-6 w-6 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-900">AI-assisted</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Summaries, quizzes, plans, and grounded Q&A when you need it.</p>
            </div>
            <div className="app-panel rounded-[1.5rem] p-4 stagger-rise stagger-delay-3">
              <SparklesIcon className="h-6 w-6 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-900">Designed to feel good</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">A softer, more premium interface for deep work.</p>
            </div>
          </div>
        </section>

        <section className="app-panel-strong floating-card p-8 md:p-10 stagger-rise stagger-delay-2">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Welcome</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Sign in to continue</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use Google to unlock your personalized workspace, sync your progress, and access your learning data securely.
          </p>

          <div className="mt-6">
            <ConfigErrorBanner />
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="app-button-primary mt-8 w-full px-5 py-4 text-sm"
          >
            <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.4 512 0 398.6 0 256S111.4 0 244 0c71.2 0 132.8 28.2 178.2 73.4l-68.8 67.3C321.4 112.2 285.8 96 244 96c-82.6 0-149.2 67.2-149.2 160s66.6 160 149.2 160c96.3 0 126-68.3 130.8-103.8H244v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.8z"></path>
            </svg>
            Continue with Google
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          <div className="surface-divider mt-8 pt-6 text-sm text-slate-500">
            <p>Built for students who want more clarity, less friction, and tools that actually support learning.</p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">&copy; 2026 ShikshakX</p>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
