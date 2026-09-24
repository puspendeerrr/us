import { z } from 'zod';
import { isValidIanaTimezone } from './relationship-timer';

export const relationshipSettingsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((val) => {
      const [year, month, day] = val.split('-').map(Number);
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      const daysInMonth = new Date(year, month, 0).getDate();
      return day >= 1 && day <= daysInMonth;
    }, 'Invalid calendar date'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:mm format (00:00 - 23:59)'),
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .refine((val) => isValidIanaTimezone(val), 'Must be a valid IANA timezone identifier (e.g. UTC, Asia/Kolkata)'),
});

export type RelationshipSettingsInput = z.infer<typeof relationshipSettingsSchema>;
