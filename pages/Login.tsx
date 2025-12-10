import React from 'react';
import { auth, googleProvider, signInWithPopup } from '../services/firebase';
import { toast } from '../components/Toast';
import ConfigErrorBanner from '../components/ConfigErrorBanner';

const Login: React.FC = () => {

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
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-slate-800 text-center">
        <div>
            <h1 className="text-4xl font-bold tracking-wider text-slate-900 dark:text-white">ShikshakX</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Your AI-Powered Learning Companion</p>
        </div>
        
        <ConfigErrorBanner />
        
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to begin organizing your courses, managing tasks, and unlocking powerful AI learning tools.
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2 -ml-1" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.4 512 0 398.6 0 256S111.4 0 244 0c71.2 0 132.8 28.2 178.2 73.4l-68.8 67.3C321.4 112.2 285.8 96 244 96c-82.6 0-149.2 67.2-149.2 160s66.6 160 149.2 160c96.3 0 126-68.3 130.8-103.8H244v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.8z"></path>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-slate-500">&copy; 2024 ShikshakX. All rights reserved.</p>

      </div>
    </div>
  );
};

export default Login;