import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';
import { getLatestSharedVoiceMemory } from '@/lib/voice/voice.service';
import { formatDuration } from '@/lib/voice/voice.types';
import { getOpenWhenSummary } from '@/lib/letters/letters.service';
import type { OpenWhenSummary } from '@/lib/letters/letters.types';
import { getNearestImportantDate } from '@/lib/dates/dates.service';
import { getBucketDashboardProgress } from '@/lib/bucket-list/bucket-list.service';
import { getCurrentUserTodayMood } from '@/lib/moods/mood.service';
import { getLatestTimelineEvent } from '@/lib/timeline/timeline.service';

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
  openWhen: null | OpenWhenSummary;
}

/**
 * Aggregates real Home Dashboard data strictly adhering to privacy guarantees:
 * - Only queries real database state.
 * - Filters out all private partner records at the query layer.
 * - Returns null for unseeded/unmigrated modules to ensure genuine empty states.
 */
export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const [
    latestVoiceItem,
    openWhenSummary,
    nearestDateItem,
    bucketProgressData,
    todayMoodItem,
    latestTimelineItem,
  ] = await Promise.all([
    getLatestSharedVoiceMemory(),
    getOpenWhenSummary(user.id),
    getNearestImportantDate(user.id),
    getBucketDashboardProgress(user.id),
    getCurrentUserTodayMood(user.id),
    getLatestTimelineEvent(user.id),
  ]);

  return {
    nearestDate: nearestDateItem,
    bucketProgress: bucketProgressData,
    todayMood: todayMoodItem,
    latestTimeline: latestTimelineItem,
    latestVoice: latestVoiceItem
      ? {
          id: latestVoiceItem.id,
          title: latestVoiceItem.title,
          duration: latestVoiceItem.durationSeconds,
          formattedDuration: formatDuration(latestVoiceItem.durationSeconds),
          authorName: latestVoiceItem.owner.displayName,
        }
      : null,
    openWhen: openWhenSummary,
  };
}
