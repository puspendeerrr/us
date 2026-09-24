'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, CheckCircle2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { isValidIanaTimezone } from '@/lib/relationship/relationship-timer';

interface RelationshipSettingsEditorProps {
  initialSettings: {
    date: string | null;
    time: string | null;
    timezone: string;
    startAt: string | Date | null;
    partnerAName: string | null;
    partnerBName: string | null;
  } | null;
}

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function RelationshipSettingsEditor({ initialSettings }: RelationshipSettingsEditorProps) {
  const router = useRouter();

  // Detect user local timezone if unconfigured
  const defaultTz = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const [date, setDate] = React.useState(initialSettings?.date || '');
  const [time, setTime] = React.useState(initialSettings?.time || '00:00');
  const [timezone, setTimezone] = React.useState(initialSettings?.timezone || defaultTz);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Track initial state to detect unsaved changes
  const initialDate = initialSettings?.date || '';
  const initialTime = initialSettings?.time || '00:00';
  const initialTz = initialSettings?.timezone || defaultTz;

  const hasUnsavedChanges = date !== initialDate || time !== initialTime || timezone !== initialTz;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!date) {
      setError('Please select a valid relationship start date.');
      return;
    }

    if (!time) {
      setError('Please enter a relationship start time (e.g. 00:00).');
      return;
    }

    if (!timezone.trim() || !isValidIanaTimezone(timezone.trim())) {
      setError('Please enter a valid IANA timezone (e.g. Asia/Kolkata, UTC, America/New_York).');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/settings/relationship', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time,
          timezone: timezone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save relationship settings. Please try again.');
        setLoading(false);
        return;
      }

      setSavedSuccess(true);
      setLoading(false);
      router.refresh();
    } catch (err) {
      console.error('Save relationship settings error:', err);
      setError('A network error occurred. Please verify your connection and retry.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDate(initialDate);
    setTime(initialTime);
    setTimezone(initialTz);
    setError(null);
    setSavedSuccess(false);
  };

  return (
    <Card className="border-border">
      <form onSubmit={handleSubmit}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Relationship Start Configuration</CardTitle>
            </div>
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Unsaved changes
              </span>
            )}
          </div>
          <CardDescription>
            Configure the exact date, time, and timezone of your anniversary. This establishes the canonical source of truth for your Together Timer.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3 text-xs rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Relationship settings saved to database successfully. Canonical timer updated.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label htmlFor="rel-date" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Start Date (YYYY-MM-DD)
              </label>
              <Input
                id="rel-date"
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSavedSuccess(false);
                }}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-1.5">
              <label htmlFor="rel-time" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Start Time (HH:mm 24-hr)
              </label>
              <Input
                id="rel-time"
                type="time"
                required
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setSavedSuccess(false);
                }}
                disabled={loading}
                className="h-10"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <label htmlFor="rel-timezone" className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Timezone (IANA Identifier)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="rel-timezone"
                type="text"
                required
                placeholder="e.g. Asia/Kolkata"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setSavedSuccess(false);
                }}
                disabled={loading}
                className="h-10 flex-1 font-mono text-sm"
              />
              <select
                aria-label="Common timezones selection"
                value={COMMON_TIMEZONES.includes(timezone) ? timezone : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setTimezone(e.target.value);
                    setSavedSuccess(false);
                  }
                }}
                disabled={loading}
                className="h-10 px-3 text-xs rounded-md border border-input bg-background text-foreground"
              >
                <option value="">Quick Select...</option>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Canonical timestamp is normalized against this timezone regardless of whichever device or location you log in from.
            </p>
          </div>

          {/* Canonical Status Notice */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-primary" />
            <span>
              {initialSettings?.startAt
                ? `Current Canonical UTC Epoch: ${new Date(initialSettings.startAt).toISOString()}`
                : 'No canonical relationship start epoch configured yet.'}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-2 flex items-center justify-between border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || loading}
            className="text-xs"
          >
            Reset
          </Button>

          <Button type="submit" disabled={loading || !hasUnsavedChanges} size="sm" className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Save Relationship Date
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
