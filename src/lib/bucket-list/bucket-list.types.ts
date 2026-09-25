export type BucketCategory =
  | 'TRAVEL'
  | 'FOOD'
  | 'EXPERIENCES'
  | 'MOVIES'
  | 'LEARNING'
  | 'ADVENTURE'
  | 'PERSONAL'
  | 'CUSTOM';

export interface BucketProgress {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export interface BucketItemDetail {
  id: string;
  title: string;
  description: string | null;
  category: BucketCategory;
  isCompleted: boolean;
  completedAt: string | null;
  createdById: string;
  createdBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BucketListResponse {
  items: BucketItemDetail[];
  total: number;
  progress: BucketProgress;
}
