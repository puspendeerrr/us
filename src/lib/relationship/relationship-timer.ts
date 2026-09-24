/**
 * Pure functions for canonical timestamp resolution and together timer calculation.
 * Adheres strictly to functional calculation with zero drift, tab visibility recovery,
 * and zero mock values.
 */

export interface TimerDuration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFuture: boolean;
  totalMilliseconds: number;
  formattedDays: string;
  formattedDetailed: string;
}

/**
 * Validates whether a given string is a valid IANA timezone name.
 */
export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a date (YYYY-MM-DD), time (HH:mm), and IANA timezone into a canonical UTC Date object.
 */
export function parseZonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // UTC initial estimate
  const utcEstimate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcEstimate);
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);

  let localHour = getPart('hour');
  if (localHour === 24) localHour = 0;

  const localTimeAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    localHour,
    getPart('minute'),
    getPart('second')
  );

  const offset = localTimeAsUtc - utcEstimate.getTime();
  return new Date(utcEstimate.getTime() - offset);
}

/**
 * Pads a number with a leading zero if less than 10.
 */
function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Calculates the exact duration between a relationship start timestamp and current time.
 * Fully deterministic based on canonical milliseconds.
 */
export function calculateDuration(
  startInstant: Date | string | number,
  currentInstant: Date | string | number = Date.now()
): TimerDuration {
  const startMs = typeof startInstant === 'object' ? startInstant.getTime() : new Date(startInstant).getTime();
  const currentMs = typeof currentInstant === 'object' ? currentInstant.getTime() : new Date(currentInstant).getTime();

  if (isNaN(startMs) || isNaN(currentMs)) {
    throw new Error('Invalid timestamp passed to calculateDuration');
  }

  const isFuture = currentMs < startMs;
  const diffMs = isFuture ? startMs - currentMs : currentMs - startMs;

  const totalSeconds = Math.floor(diffMs / 1000);
  const seconds = totalSeconds % 60;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;

  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;

  const days = Math.floor(totalHours / 24);

  const dayLabel = days === 1 ? 'DAY' : 'DAYS';
  const hourLabel = hours === 1 ? 'HOUR' : 'HOURS';
  const minLabel = minutes === 1 ? 'MINUTE' : 'MINUTES';
  const secLabel = seconds === 1 ? 'SECOND' : 'SECONDS';

  const formattedDays = `${days} ${dayLabel}`;
  const formattedDetailed = `${days} ${dayLabel} : ${pad(hours)} ${hourLabel} : ${pad(minutes)} ${minLabel} : ${pad(seconds)} ${secLabel}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isFuture,
    totalMilliseconds: diffMs,
    formattedDays,
    formattedDetailed,
  };
}
