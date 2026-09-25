export type DateCategory =
  | 'ANNIVERSARY'
  | 'BIRTHDAY'
  | 'FIRST_MEET'
  | 'FIRST_CALL'
  | 'FIRST_DATE'
  | 'TRIP'
  | 'CUSTOM';

export interface ImportantDateItem {
  id: string;
  title: string;
  description: string | null;
  category: DateCategory;
  date: string; // ISO string of stored original date
  originalDate: string; // ISO string alias
  recursAnnually: boolean;
  createdById: string;
  createdBy: {
    id: string;
    displayName: string;
  };
  nextOccurrence: string | null; // ISO string of next occurrence, or null if past non-recurring
  daysUntil: number; // 0 for today, >0 for upcoming, <0 for past non-recurring
  isToday: boolean;
  isPast: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportantDatesListResponse {
  items: ImportantDateItem[];
  total: number;
}
