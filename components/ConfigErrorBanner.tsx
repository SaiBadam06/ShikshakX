import React from 'react';
import { firebaseConfig, isFirebaseConfigured } from '../services/firebase';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const formatValue = (value?: string) => value ? `${value.slice(0, 10)}...` : 'Missing';

const ConfigErrorBanner: React.FC = () => {
  if (isFirebaseConfigured) {
    return null;
  }

  return (
    <div className="app-panel border-red-200/70 bg-red-50/80 p-4 text-sm text-red-900" role="alert">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
        <h3 className="text-lg font-semibold">Firebase setup is incomplete</h3>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-6">
        <p>
          Google sign-in and Firestore data rely on your own Firebase project settings. Right now the app is
          missing one or more required environment values, so auth and database actions may fail.
        </p>
        <div className="rounded-2xl bg-white/70 p-3 font-mono text-xs text-red-950">
          <p>Project ID: {firebaseConfig.projectId || 'Missing'}</p>
          <p>API Key: {formatValue(firebaseConfig.apiKey)}</p>
          <p>Auth Domain: {firebaseConfig.authDomain || 'Missing'}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p>1. Add the Firebase values to your local `.env` file.</p>
        <p>2. Confirm your Firebase project allows the app domain in Authentication.</p>
        <p>3. Restart the dev server after updating the credentials.</p>
      </div>
    </div>
  );
};

export default ConfigErrorBanner;
