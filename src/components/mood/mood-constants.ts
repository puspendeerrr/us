import {
  Heart,
  Smile,
  Meh,
  Compass,
  Frown,
  CloudRain,
  BatteryLow,
  LucideIcon,
} from 'lucide-react';
import type { MoodType } from '@/lib/moods/mood.types';

export interface MoodConfig {
  type: MoodType;
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
  bgClassName: string;
}

export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  LOVED: {
    type: 'LOVED',
    label: 'Loved',
    icon: Heart,
    badgeClassName: 'border-rose-500/30 text-rose-500 bg-rose-500/10',
    bgClassName: 'hover:bg-rose-500/10 data-[selected=true]:border-rose-500 data-[selected=true]:bg-rose-500/10',
  },
  HAPPY: {
    type: 'HAPPY',
    label: 'Happy',
    icon: Smile,
    badgeClassName: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10',
    bgClassName: 'hover:bg-emerald-500/10 data-[selected=true]:border-emerald-500 data-[selected=true]:bg-emerald-500/10',
  },
  NORMAL: {
    type: 'NORMAL',
    label: 'Normal',
    icon: Meh,
    badgeClassName: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
    bgClassName: 'hover:bg-blue-500/10 data-[selected=true]:border-blue-500 data-[selected=true]:bg-blue-500/10',
  },
  MISSING_YOU: {
    type: 'MISSING_YOU',
    label: 'Missing You',
    icon: Compass,
    badgeClassName: 'border-purple-500/30 text-purple-500 bg-purple-500/10',
    bgClassName: 'hover:bg-purple-500/10 data-[selected=true]:border-purple-500 data-[selected=true]:bg-purple-500/10',
  },
  ANGRY_FRUSTRATED: {
    type: 'ANGRY_FRUSTRATED',
    label: 'Angry / Frustrated',
    icon: Frown,
    badgeClassName: 'border-amber-500/30 text-amber-500 bg-amber-500/10',
    bgClassName: 'hover:bg-amber-500/10 data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-500/10',
  },
  EMOTIONAL: {
    type: 'EMOTIONAL',
    label: 'Emotional',
    icon: CloudRain,
    badgeClassName: 'border-cyan-500/30 text-cyan-500 bg-cyan-500/10',
    bgClassName: 'hover:bg-cyan-500/10 data-[selected=true]:border-cyan-500 data-[selected=true]:bg-cyan-500/10',
  },
  TIRED_DRAINED: {
    type: 'TIRED_DRAINED',
    label: 'Tired / Drained',
    icon: BatteryLow,
    badgeClassName: 'border-zinc-500/30 text-zinc-500 bg-zinc-500/10',
    bgClassName: 'hover:bg-zinc-500/10 data-[selected=true]:border-zinc-500 data-[selected=true]:bg-zinc-500/10',
  },
};

export const ALL_MOODS: MoodType[] = [
  'LOVED',
  'HAPPY',
  'NORMAL',
  'MISSING_YOU',
  'ANGRY_FRUSTRATED',
  'EMOTIONAL',
  'TIRED_DRAINED',
];
