export type MoodType =
  | 'LOVED'
  | 'HAPPY'
  | 'NORMAL'
  | 'MISSING_YOU'
  | 'ANGRY_FRUSTRATED'
  | 'EMOTIONAL'
  | 'TIRED_DRAINED';

export type MoodVisibility = 'SHARED' | 'PRIVATE';

export interface MoodEntryDetail {
  id: string;
  mood: MoodType;
  note: string | null;
  date: string;
  visibility: MoodVisibility;
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

export interface MoodQueryParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  mood?: MoodType;
  visibility?: 'ALL' | 'SHARED' | 'PRIVATE';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MoodListResponse {
  items: MoodEntryDetail[];
  total: number;
}

export interface CreateMoodInput {
  mood: MoodType;
  note?: string | null;
  date: string;
  visibility: MoodVisibility;
}

export interface UpdateMoodInput {
  mood?: MoodType;
  note?: string | null;
  date?: string;
  visibility?: MoodVisibility;
}
