import React from 'react';
import { firebaseConfig } from '../services/firebase';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const PLACEHOLDER_API_KEY = 'YOUR_FIREBASE_API_KEY';
const PLACEHOLDER_PROJECT_ID = 'shikshakx';

const ConfigErrorBanner: React.FC = () => {
  const isConfigPlaceholder = 
    firebaseConfig.apiKey === PLACEHOLDER_API_KEY || 
    firebaseConfig.projectId === PLACEHOLDER_PROJECT_ID;

  if (!isConfigPlaceholder) {
    return null;
  }

  return (
    <div className="p-4 my-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-slate-900/50 dark:text-red-300 border border-red-400 dark:border-red-600" role="alert">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
        <h3 className="text-lg font-medium">Action Required: Firebase Not Configured</h3>
      </div>
      <div className="mt-2 mb-4 text-sm">
        The application has detected the default placeholder credentials. To enable user sign-in and connect to your own database, you must configure Firebase.
        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-slate-800 text-red-900 dark:text-red-200 font-mono text-xs">
          <p>Detected Project ID: "{PLACEHOLDER_PROJECT_ID}"</p>
          <p>Detected API Key: "{PLACEHOLDER_API_KEY.substring(0, 20)}..."</p>
        </div>
      </div>
      <div className="flex flex-col space-y-2 text-sm">
        <p>1. Update the <strong>`firebaseConfig`</strong> object in <strong>`src/services/firebase.ts`</strong>.</p>
        <p>2. Ensure your Firestore <strong>security rules</strong> are set correctly in the Firebase Console.</p>
        <p className="mt-2 font-semibold">
          3. After saving your changes, you must restart the development server (stop `npm run dev` and run it again).
        </p>
        <p className="mt-2">Please follow the detailed instructions in the <strong>README.md</strong> file to resolve this.</p>
      </div>
    </div>
  );
};

export default ConfigErrorBanner;
