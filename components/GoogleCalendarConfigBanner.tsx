import React from 'react';
import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../services/calendarClient';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const GoogleCalendarConfigBanner: React.FC = () => {
  const isConfigured = !GOOGLE_API_KEY.startsWith("YOUR_") && !GOOGLE_CLIENT_ID.startsWith("YOUR_");

  if (isConfigured) {
    return null;
  }

  return (
    <div className="p-4 mb-6 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-slate-900/50 dark:text-yellow-300 border border-yellow-400 dark:border-yellow-600" role="alert">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
        <h3 className="text-lg font-medium">Google Calendar Integration Not Configured</h3>
      </div>
      <div className="mt-2 text-sm">
        <p>To enable syncing tasks with Google Calendar, you need to provide your own API Key and Client ID.</p>
        <p className="mt-2">Please follow the setup instructions in the <strong>README.md</strong> file (Step 4).</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Create API credentials in the Google Cloud Console.</li>
          <li>Configure the OAuth Consent Screen and add your email as a test user.</li>
          <li>Update the placeholder values in <strong>`src/services/calendarClient.ts`</strong>.</li>
          <li>Restart the development server to apply changes.</li>
        </ol>
      </div>
    </div>
  );
};

export default GoogleCalendarConfigBanner;
