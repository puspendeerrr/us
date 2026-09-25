import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, Smile, Clock, Mic, Mail, ArrowRight } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard.service';

interface DashboardWidgetsProps {
  data: DashboardData;
}

function formatUnlockRemaining(unlockAtIso: string): string {
  const diffMs = new Date(unlockAtIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Ready to open';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) return `Next letter unlocks in ${diffDays} days`;
  if (diffDays === 1) return 'Next letter unlocks tomorrow';
  if (diffHours > 1) return `Next letter unlocks in ${diffHours} hours`;
  if (diffHours === 1) return 'Next letter unlocks in 1 hour';
  if (diffMinutes > 1) return `Next letter unlocks in ${diffMinutes} mins`;
  return 'Next letter unlocks soon';
}

export function DashboardWidgets({ data }: DashboardWidgetsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Nearest Important Date */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Important Date</CardTitle>
            </div>
            <Link
              href="/dates"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.nearestDate ? (
            <div>
              <p className="text-base font-bold text-foreground">{data.nearestDate.title}</p>
              <p className="text-xs text-muted-foreground">{data.nearestDate.date}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No important dates yet.</p>
          )}
        </CardContent>
      </Card>

      {/* 2. Bucket List Progress */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Bucket List</CardTitle>
            </div>
            <Link
              href="/bucket-list"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.bucketProgress && data.bucketProgress.totalCount > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-foreground">
                  {data.bucketProgress.completedCount} of {data.bucketProgress.totalCount} completed
                </p>
                <span className="text-xs font-semibold text-primary">{data.bucketProgress.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, data.bucketProgress.percentage))}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No bucket list items yet.</p>
          )}
        </CardContent>
      </Card>

      {/* 3. Today's Mood */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Today's Mood</CardTitle>
            </div>
            <Link
              href="/mood"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.todayMood ? (
            <div>
              <p className="text-base font-bold text-foreground">{data.todayMood.mood}</p>
              {data.todayMood.note && (
                <p className="text-xs text-muted-foreground truncate">{data.todayMood.note}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No mood entry for today.</p>
          )}
        </CardContent>
      </Card>

      {/* 4. Latest Timeline Event */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Timeline Memory</CardTitle>
            </div>
            <Link
              href="/timeline"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.latestTimeline ? (
            <div>
              <p className="text-base font-bold text-foreground">{data.latestTimeline.title}</p>
              <p className="text-xs text-muted-foreground">{data.latestTimeline.eventDate}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No timeline memories yet.</p>
          )}
        </CardContent>
      </Card>

      {/* 5. Recent Voice Memory */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Voice Memory</CardTitle>
            </div>
            <Link
              href="/voice"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.latestVoice ? (
            <div>
              <p className="text-base font-bold text-foreground truncate">{data.latestVoice.title}</p>
              <p className="text-xs text-muted-foreground">{data.latestVoice.formattedDuration} &bull; {data.latestVoice.authorName}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No voice memories yet.</p>
          )}
        </CardContent>
      </Card>

      {/* 6. Open When Letters Widget */}
      <Card className="border-border flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Open When</CardTitle>
            </div>
            <Link
              href="/letters"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {!data.openWhen || !data.openWhen.hasLetters ? (
            <p className="text-xs text-muted-foreground py-2">No letters yet.</p>
          ) : data.openWhen.readyCount > 0 ? (
            <div>
              <p className="text-base font-bold text-foreground">
                {data.openWhen.readyCount} {data.openWhen.readyCount === 1 ? 'letter' : 'letters'} ready to open
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ready now</p>
            </div>
          ) : data.openWhen.nextUnlockAt ? (
            <div>
              <p className="text-base font-bold text-foreground">
                {formatUnlockRemaining(data.openWhen.nextUnlockAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(data.openWhen.nextUnlockAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No unopened letters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
