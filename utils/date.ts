import type { Timestamp } from 'firebase/firestore';

type TimestampLike = Timestamp | { toDate: () => Date };
export type DateLike = Date | TimestampLike | string | number | null | undefined;

const isTimestampLike = (value: unknown): value is TimestampLike =>
  Boolean(value && typeof value === 'object' && 'toDate' in value && typeof (value as TimestampLike).toDate === 'function');

export const toDate = (value: DateLike, fallback = new Date()): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (isTimestampLike(value)) {
    return value.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
};

export const formatDate = (
  value: DateLike,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  locale = 'en-US',
) => toDate(value).toLocaleDateString(locale, options);

export const formatDateTime = (
  value: DateLike,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  },
  locale = 'en-US',
) => toDate(value).toLocaleString(locale, options);

export const formatTime = (
  value: DateLike,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
  locale = 'en-US',
) => toDate(value).toLocaleTimeString(locale, options);
