import {
  Sparkles,
  Milestone,
  Plane,
  Camera,
  Award,
  Bookmark,
  LucideIcon,
} from 'lucide-react';
import type { TimelineCategory } from '@/lib/timeline/timeline.types';

export interface TimelineCategoryConfig {
  type: TimelineCategory;
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
}

export const TIMELINE_CATEGORY_CONFIGS: Record<TimelineCategory, TimelineCategoryConfig> = {
  BEGINNING: {
    type: 'BEGINNING',
    label: 'Beginning',
    icon: Sparkles,
    badgeClassName: 'border-amber-500/30 text-amber-500 bg-amber-500/10',
  },
  MILESTONE: {
    type: 'MILESTONE',
    label: 'Milestone',
    icon: Milestone,
    badgeClassName: 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  },
  TRIP: {
    type: 'TRIP',
    label: 'Trip',
    icon: Plane,
    badgeClassName: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  },
  MEMORY: {
    type: 'MEMORY',
    label: 'Memory',
    icon: Camera,
    badgeClassName: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10',
  },
  ACHIEVEMENT: {
    type: 'ACHIEVEMENT',
    label: 'Achievement',
    icon: Award,
    badgeClassName: 'border-rose-500/30 text-rose-500 bg-rose-500/10',
  },
  CUSTOM: {
    type: 'CUSTOM',
    label: 'Custom',
    icon: Bookmark,
    badgeClassName: 'border-zinc-500/30 text-zinc-500 bg-zinc-500/10',
  },
};

export const ALL_TIMELINE_CATEGORIES: TimelineCategory[] = [
  'BEGINNING',
  'MILESTONE',
  'TRIP',
  'MEMORY',
  'ACHIEVEMENT',
  'CUSTOM',
];
