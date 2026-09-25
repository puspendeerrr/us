'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smile, Lock, Users, Plus, Pencil, Clock } from 'lucide-react';
import { MOOD_CONFIGS } from './mood-constants';
import type { MoodEntryDetail } from '@/lib/moods/mood.types';

interface TodayCheckinCardProps {
  todayEntry: MoodEntryDetail | null;
  onLogClick: () => void;
  onEditClick: (entry: MoodEntryDetail) => void;
}

export function TodayCheckinCard({
  todayEntry,
  onLogClick,
  onEditClick,
}: TodayCheckinCardProps) {
  if (!todayEntry) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Smile className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">How are you feeling today?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                You haven't logged a check-in for today yet. Take a moment to reflect.
              </p>
            </div>
          </div>
          <Button onClick={onLogClick} size="sm" className="gap-1.5 shrink-0 text-xs">
            <Plus className="w-4 h-4" />
            Check In Today
          </Button>
        </CardContent>
      </Card>
    );
  }

  const config = MOOD_CONFIGS[todayEntry.mood];
  const Icon = config.icon;
  const timeStr = new Date(todayEntry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground">Your Check-In Today</span>
              <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 gap-1 ${config.badgeClassName}`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
              {todayEntry.visibility === 'PRIVATE' ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 border-muted">
                  <Lock className="w-2.5 h-2.5" />
                  Private to you
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 border-muted">
                  <Users className="w-2.5 h-2.5" />
                  Shared
                </Badge>
              )}
            </div>
            {todayEntry.note ? (
              <p className="text-xs text-foreground/80 line-clamp-1 italic">
                "{todayEntry.note}"
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Logged at {timeStr}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(todayEntry)}
            className="gap-1.5 text-xs h-8"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogClick}
            className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
