import React from 'react';
import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID, isGoogleCalendarConfigured } from '../services/calendarClient';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const GoogleCalendarConfigBanner: React.FC = () => {
  if (isGoogleCalendarConfigured) {
    return null;
  }

  return (
    <div className="app-panel mb-6 border-amber-200/70 bg-amber-50/85 p-4 text-sm text-amber-900" role="alert">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
        <h3 className="text-lg font-semibold">Google Calendar is not connected yet</h3>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-6">
        <p>Task syncing still works locally, but calendar export needs the Google Cloud credentials from your `.env` file.</p>
        <p>Configured API key: {GOOGLE_API_KEY ? 'Present' : 'Missing'}</p>
        <p>Configured client ID: {GOOGLE_CLIENT_ID ? 'Present' : 'Missing'}</p>
        <p>After adding both values in `.env`, restart the app and reconnect Google Calendar.</p>
      </div>
    </div>
  );
};

export default GoogleCalendarConfigBanner;
