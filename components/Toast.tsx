import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const toastListeners = new Set<(toast: ToastMessage) => void>();

export const toast = {
  success: (message: string) => {
    toastId += 1;
    toastListeners.forEach(listener => listener({ id: toastId, message, type: 'success' }));
  },
  error: (message: string) => {
    toastId += 1;
    toastListeners.forEach(listener => listener({ id: toastId, message, type: 'error' }));
  },
  info: (message: string) => {
    toastId += 1;
    toastListeners.forEach(listener => listener({ id: toastId, message, type: 'info' }));
  }
};

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const colors: Record<ToastType, string> = {
  success: 'border-emerald-200/80 bg-white text-slate-900',
  error: 'border-red-200/80 bg-white text-slate-900',
  info: 'border-blue-200/80 bg-white text-slate-900',
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const newToastListener = (newToast: ToastMessage) => {
      setToasts(currentToasts => [...currentToasts, newToast]);
      setTimeout(() => {
        setToasts(currentToasts => currentToasts.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    toastListeners.add(newToastListener);
    return () => {
      toastListeners.delete(newToastListener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-3 sm:right-6 sm:top-6">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex min-w-[18rem] max-w-sm items-start gap-3 rounded-[1.35rem] border px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl ${colors[t.type]}`}
          >
            <div className={`mt-0.5 rounded-full p-1.5 ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600' : t.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="flex-1 text-sm font-medium leading-6">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};
