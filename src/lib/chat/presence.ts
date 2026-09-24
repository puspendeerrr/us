/**
 * Presence formatting and utilities for partner availability.
 * Follows clean user-facing messaging conventions without exposing technical internals.
 */

export interface PresenceState {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | Date | null;
}

/**
 * Formats a lastSeen timestamp into human-friendly relative presence text.
 * Uses the local browser/device timezone.
 *
 * Examples:
 * - < 1 min: "Last seen just now"
 * - 1-59 min: "Last seen 12 min ago"
 * - Today: "Last seen today at 10:42 PM"
 * - Yesterday: "Last seen yesterday at 8:15 PM"
 * - Older: "Last seen 24 Sep at 10:42 PM"
 */
export function formatLastSeen(
  dateInput: Date | string | number | null | undefined,
  nowInput: Date = new Date()
): string {
  if (!dateInput) return 'Offline';

  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) return 'Offline';

  const now = nowInput;
  const diffMs = now.getTime() - date.getTime();

  // If in the future or under 1 minute ago
  if (diffMs < 60 * 1000) {
    return 'Last seen just now';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `Last seen ${diffMinutes} min ago`;
  }

  // Format time portion in user's local timezone (e.g. "10:42 PM")
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const timeStr = timeFormatter.format(date);

  // Check if today: same calendar year, month, date in local timezone
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return `Last seen today at ${timeStr}`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  }

  // Older dates: e.g. "24 Sep at 10:42 PM"
  const day = date.getDate();
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const monthStr = monthFormatter.format(date);

  return `Last seen ${day} ${monthStr} at ${timeStr}`;
}
