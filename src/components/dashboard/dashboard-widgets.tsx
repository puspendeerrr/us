import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, CheckSquare, Smile, Clock, Mic, ArrowRight } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard.service';

interface DashboardWidgetsProps {
  data: DashboardData;
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
            <div>
              <p className="text-base font-bold text-foreground">
                {data.bucketProgress.completedCount} / {data.bucketProgress.totalCount} completed
              </p>
              <p className="text-xs text-muted-foreground">{data.bucketProgress.percentage}% achieved</p>
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
              <p className="text-base font-bold text-foreground">{data.latestVoice.title}</p>
              <p className="text-xs text-muted-foreground">{data.latestVoice.duration}s recording</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No voice memories yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
