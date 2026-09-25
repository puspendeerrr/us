import { DateCategory } from './dates.types';

/**
 * Checks whether a given calendar year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Resolves an annual recurring month/day into a specific year.
 * DETERMINISTIC FEB 29 RULE:
 * For non-leap years, February 29 resolves deterministically to February 28.
 */
export function getRecurringDateInYear(year: number, origMonth: number, origDay: number): Date {
  let day = origDay;

  // origMonth: 0 = January, 1 = February
  if (origMonth === 1 && origDay === 29 && !isLeapYear(year)) {
    day = 28;
  }

  return new Date(Date.UTC(year, origMonth, day, 0, 0, 0, 0));
}

export interface ComputedDateDetails {
  originalDate: string;
  nextOccurrence: string | null;
  daysUntil: number;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Computes authoritative countdown and next occurrence information for an Important Date.
 * Uses UTC midnight boundaries for deterministic calendar-day calculations.
 */
export function computeDateOccurrences(
  storedDate: Date | string,
  recursAnnually: boolean,
  now: Date = new Date()
): ComputedDateDetails {
  const stored = typeof storedDate === 'string' ? new Date(storedDate) : storedDate;

  const origYear = stored.getUTCFullYear();
  const origMonth = stored.getUTCMonth();
  const origDay = stored.getUTCDate();

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  const todayMidnightMs = Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0);

  if (!recursAnnually) {
    // Non-recurring date: strictly anchored to its original calendar date
    const targetMidnightMs = Date.UTC(origYear, origMonth, origDay, 0, 0, 0, 0);
    const diffMs = targetMidnightMs - todayMidnightMs;
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return {
        originalDate: stored.toISOString(),
        nextOccurrence: new Date(targetMidnightMs).toISOString(),
        daysUntil: 0,
        isToday: true,
        isPast: false,
      };
    } else if (diffDays > 0) {
      return {
        originalDate: stored.toISOString(),
        nextOccurrence: new Date(targetMidnightMs).toISOString(),
        daysUntil: diffDays,
        isToday: false,
        isPast: false,
      };
    } else {
      // Past non-recurring date: nextOccurrence is null
      return {
        originalDate: stored.toISOString(),
        nextOccurrence: null,
        daysUntil: diffDays,
        isToday: false,
        isPast: true,
      };
    }
  }

  // Recurring annually: determine whether this year's occurrence is today/future or already passed
  const candThisYear = getRecurringDateInYear(currentYear, origMonth, origDay);
  const candThisYearMs = candThisYear.getTime();

  let nextOccurrenceDate: Date;

  if (candThisYearMs >= todayMidnightMs) {
    nextOccurrenceDate = candThisYear;
  } else {
    // Already passed this calendar year, so next occurrence is next year
    nextOccurrenceDate = getRecurringDateInYear(currentYear + 1, origMonth, origDay);
  }

  const diffMs = nextOccurrenceDate.getTime() - todayMidnightMs;
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  return {
    originalDate: stored.toISOString(),
    nextOccurrence: nextOccurrenceDate.toISOString(),
    daysUntil: diffDays,
    isToday: diffDays === 0,
    isPast: false, // Recurring dates always have an upcoming or today occurrence
  };
}

/**
 * Returns a human-friendly countdown display string.
 */
export function formatCountdown(daysUntil: number, isToday: boolean, isPast: boolean): string {
  if (isToday) return 'Today';
  if (isPast) return 'Past';
  if (daysUntil === 1) return 'In 1 day';
  return `In ${daysUntil} days`;
}

/**
 * Returns clean human-readable category labels.
 */
export function formatCategoryLabel(category: DateCategory): string {
  switch (category) {
    case 'ANNIVERSARY':
      return 'Anniversary';
    case 'BIRTHDAY':
      return 'Birthday';
    case 'FIRST_MEET':
      return 'First Meet';
    case 'FIRST_CALL':
      return 'First Call';
    case 'FIRST_DATE':
      return 'First Date';
    case 'TRIP':
      return 'Trip';
    case 'CUSTOM':
      return 'Custom';
    default:
      return category;
  }
}
