'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Clock, Calendar, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { calculateDuration, type TimerDuration } from '@/lib/relationship/relationship-timer';

interface RelationshipTimerProps {
  startAt: string | null;
  date: string | null;
  time: string | null;
  timezone: string;
  partnerAName?: string | null;
  partnerBName?: string | null;
}

export function RelationshipTimer({
  startAt,
  date,
  time,
  timezone,
  partnerAName,
  partnerBName,
}: RelationshipTimerProps) {
  // Mode: 'days' | 'detailed'
  const [mode, setMode] = React.useState<'days' | 'detailed'>('days');
  const [duration, setDuration] = React.useState<TimerDuration | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Initialize mode from localStorage safely on mount
  React.useEffect(() => {
    setMounted(true);
    try {
      const savedMode = localStorage.getItem('our_space_timer_mode');
      if (savedMode === 'days' || savedMode === 'detailed') {
        setMode(savedMode);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleMode = () => {
    const nextMode = mode === 'days' ? 'detailed' : 'days';
    setMode(nextMode);
    try {
      localStorage.setItem('our_space_timer_mode', nextMode);
    } catch {
      // Ignore
    }
  };

  // Canonical timer calculation
  React.useEffect(() => {
    if (!startAt) {
      setDuration(null);
      return;
    }

    const compute = () => {
      try {
        const d = calculateDuration(startAt, Date.now());
        setDuration(d);
      } catch (err) {
        console.error('Timer calculation error:', err);
      }
    };

    // Immediate calculation
    compute();

    // Live update every second (derives from actual clock timestamps, avoiding drift)
    const interval = setInterval(compute, 1000);

    // Immediate recovery when tab becomes visible after backgrounding
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        compute();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startAt]);

  // Case 1: Unconfigured State
  if (!startAt || !date) {
    return (
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Together Timer</CardTitle>
          </div>
          <CardDescription>
            Relationship timer isn't configured yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Set your canonical relationship start date and time to activate the shared timer.
          </p>
          <Link
            href="/settings"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 shrink-0' })}
          >
            <span>Set relationship date</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Hydration fallback
  if (!mounted || !duration) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="h-28 flex items-center justify-center">
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const isFuture = duration.isFuture;
  const title = isFuture
    ? 'Relationship Countdown'
    : partnerAName && partnerBName
    ? `${partnerAName} & ${partnerBName} Together`
    : 'Together For';

  const subtitle = isFuture
    ? 'Relationship starts in'
    : `Since ${date} ${time || ''} (${timezone})`;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <Card className="border-border relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <div>
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{title}</span>
            {isFuture && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                Future Date
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </CardDescription>
        </div>

        {/* Mode Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMode}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          title={`Switch to ${mode === 'days' ? 'Detailed' : 'Days'} view`}
          aria-label={`Switch to ${mode === 'days' ? 'Detailed' : 'Days'} view`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{mode === 'days' ? 'Detailed View' : 'Days View'}</span>
          <span className="sm:hidden">{mode === 'days' ? 'Detailed' : 'Days'}</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        {mode === 'days' ? (
          /* ================= DAYS MODE ================= */
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground font-mono">
                {duration.days.toLocaleString()}
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-wider text-muted-foreground uppercase">
                {duration.days === 1 ? 'DAY' : 'DAYS'}
              </span>
            </div>
            {isFuture && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                Remaining until your relationship start epoch
              </p>
            )}
          </div>
        ) : (
          /* ================= DETAILED MODE ================= */
          <div className="py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
              {/* Days */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/80 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {duration.days.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase mt-1">
                  {duration.days === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* Hours */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/80 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {pad(duration.hours)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase mt-1">
                  {duration.hours === 1 ? 'Hour' : 'Hours'}
                </span>
              </div>

              {/* Minutes */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/80 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {pad(duration.minutes)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase mt-1">
                  {duration.minutes === 1 ? 'Minute' : 'Minutes'}
                </span>
              </div>

              {/* Seconds */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/80 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono text-primary">
                  {pad(duration.seconds)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase mt-1">
                  {duration.seconds === 1 ? 'Second' : 'Seconds'}
                </span>
              </div>
            </div>

            {/* Compact inline display format requested by spec */}
            <p className="text-center font-mono text-xs text-muted-foreground mt-4 tracking-wider">
              {duration.formattedDetailed}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
