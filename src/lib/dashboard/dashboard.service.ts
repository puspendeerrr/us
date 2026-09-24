import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';

export interface DashboardData {
  nearestDate: null | {
    title: string;
    date: string;
    daysRemaining: number;
  };
  bucketProgress: null | {
    completedCount: number;
    totalCount: number;
    percentage: number;
  };
  todayMood: null | {
    mood: string;
    note?: string | null;
  };
  latestTimeline: null | {
    title: string;
    eventDate: string;
    category?: string | null;
  };
  latestVoice: null | {
    title: string;
    duration: number;
    createdAt: Date;
  };
}

/**
 * Aggregates real Home Dashboard data strictly adhering to privacy guarantees:
 * - Only queries real database state.
 * - Filters out all private partner records at the query layer.
 * - Returns null for unseeded/unmigrated modules to ensure genuine empty states.
 */
export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  // In Phase 3, future domain models (notes, dates, bucket, mood, timeline, voice)
  // are deliberately decoupled and have not been created yet.
  // All fields return null to guarantee zero manufactured/fake records.
  return {
    nearestDate: null,
    bucketProgress: null,
    todayMood: null,
    latestTimeline: null,
    latestVoice: null,
  };
}
