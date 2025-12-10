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
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
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
    <div className="fixed bottom-5 right-5 z-50 space-y-3">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center text-white px-4 py-3 rounded-lg shadow-lg ${colors[t.type]}`}
          >
            <Icon className="h-6 w-6 mr-3" />
            <p className="flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="ml-4 p-1 rounded-full hover:bg-white/20">
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};