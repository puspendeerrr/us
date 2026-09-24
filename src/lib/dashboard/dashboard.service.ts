import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';
import { getLatestSharedVoiceMemory } from '@/lib/voice/voice.service';
import { formatDuration } from '@/lib/voice/voice.types';

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
    id: string;
    title: string;
    duration: number;
    formattedDuration: string;
    authorName: string;
  };
}

/**
 * Aggregates real Home Dashboard data strictly adhering to privacy guarantees:
 * - Only queries real database state.
 * - Filters out all private partner records at the query layer.
 * - Returns null for unseeded/unmigrated modules to ensure genuine empty states.
 */
export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const latestVoiceItem = await getLatestSharedVoiceMemory();

  return {
    nearestDate: null,
    bucketProgress: null,
    todayMood: null,
    latestTimeline: null,
    latestVoice: latestVoiceItem
      ? {
          id: latestVoiceItem.id,
          title: latestVoiceItem.title,
          duration: latestVoiceItem.durationSeconds,
          formattedDuration: formatDuration(latestVoiceItem.durationSeconds),
          authorName: latestVoiceItem.owner.displayName,
        }
      : null,
  };
}
