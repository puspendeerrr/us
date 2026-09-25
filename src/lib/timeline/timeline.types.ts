export type TimelineCategory =
  | 'BEGINNING'
  | 'MILESTONE'
  | 'TRIP'
  | 'MEMORY'
  | 'ACHIEVEMENT'
  | 'CUSTOM';

export interface TimelineEventDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: TimelineCategory;
  createdById: string;
  createdBy: {
    id: string;
    displayName: string;
    identifier: string;
  };
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
}

export interface TimelineQueryParams {
  category?: TimelineCategory;
  search?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TimelineListResponse {
  items: TimelineEventDetail[];
  total: number;
}

export interface CreateTimelineEventInput {
  title: string;
  description?: string | null;
  date: string;
  category: TimelineCategory;
}

export interface UpdateTimelineEventInput {
  title?: string;
  description?: string | null;
  date?: string;
  category?: TimelineCategory;
}
