import { prisma } from '@/lib/prisma';
import { parseZonedTimeToUtc } from './relationship-timer';
import type { RelationshipSettingsInput } from './relationship.validation';

export interface RelationshipSettingsDTO {
  id: string;
  title: string;
  startAt: Date | null;
  date: string | null;
  time: string | null;
  timezone: string;
  partnerAName: string | null;
  partnerBName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

import { cache } from 'react';

/**
 * Retrieves the canonical relationship settings singleton.
 * Ensures partner names are aligned with current user records.
 * Memoized with React.cache to avoid redundant queries during page transitions.
 */
export const getRelationshipSettings = cache(async (): Promise<RelationshipSettingsDTO | null> => {
  let settings = await prisma.relationshipSettings.findUnique({
    where: { id: 'singleton' },
  });

  // Only query users if settings are missing or partner names need initial synchronization
  if (!settings || !settings.partnerAName) {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    const partnerAName = users[0]?.displayName || null;
    const partnerBName = users[1]?.displayName || null;

    if (!settings) {
      settings = await prisma.relationshipSettings.create({
        data: {
          id: 'singleton',
          title: 'Our Space',
          timezone: 'UTC',
          partnerAName,
          partnerBName,
        },
      });
    } else if (partnerAName) {
      settings = await prisma.relationshipSettings.update({
        where: { id: 'singleton' },
        data: {
          partnerAName,
          partnerBName,
        },
      });
    }
  }

  return settings;
});

/**
 * Updates the canonical relationship start epoch and timezone.
 * Computes and stores the exact UTC canonical instant.
 */
export async function updateRelationshipSettings(
  input: RelationshipSettingsInput
): Promise<RelationshipSettingsDTO> {
  const canonicalUtc = parseZonedTimeToUtc(input.date, input.time, input.timezone);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 2,
  });

  const partnerAName = users[0]?.displayName || null;
  const partnerBName = users[1]?.displayName || null;

  const settings = await prisma.relationshipSettings.upsert({
    where: { id: 'singleton' },
    update: {
      date: input.date,
      time: input.time,
      timezone: input.timezone,
      startAt: canonicalUtc,
      partnerAName,
      partnerBName,
    },
    create: {
      id: 'singleton',
      title: 'Our Space',
      date: input.date,
      time: input.time,
      timezone: input.timezone,
      startAt: canonicalUtc,
      partnerAName,
      partnerBName,
    },
  });

  return settings;
}
