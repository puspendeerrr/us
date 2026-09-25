'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Smile, Lock, Users, Loader2 } from 'lucide-react';
import { MOOD_CONFIGS, ALL_MOODS } from './mood-constants';
import type { MoodEntryDetail, MoodType, MoodVisibility } from '@/lib/moods/mood.types';

interface MoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MoodEntryDetail | null;
  onSaved: (item: MoodEntryDetail) => void;
}

export function MoodDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: MoodDialogProps) {
  const isEditing = !!item;

  const [selectedMood, setSelectedMood] = useState<MoodType>('HAPPY');
  const [visibility, setVisibility] = useState<MoodVisibility>('SHARED');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (item) {
        setSelectedMood(item.mood);
        setVisibility(item.visibility);
        const itemDate = new Date(item.date);
        const yyyy = itemDate.getFullYear();
        const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
        const dd = String(itemDate.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setNote(item.note || '');
      } else {
        setSelectedMood('HAPPY');
        setVisibility('SHARED');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setNote('');
      }
      setError(null);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    if (note.length > 2000) {
      setError('Note cannot exceed 2000 characters.');
      return;
    }

    // Convert date string YYYY-MM-DD to UTC ISO string
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    if (isNaN(parsedDate.getTime())) {
      setError('Invalid date format.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/moods/${item.id}` : '/api/moods';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          visibility,
          date: parsedDate.toISOString(),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save mood entry.');
      }

      onSaved(data.item);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-primary" />
              <DialogTitle>{isEditing ? 'Edit Mood Entry' : 'Log Your Mood'}</DialogTitle>
            </div>
            <DialogDescription>
              {isEditing
                ? 'Update how you were feeling or your journal note.'
                : 'Check in with yourself and choose whether to share your feeling with your partner.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium"
            >
              {error}
            </div>
          )}

          {/* Mood Selector Grid */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              Select Mood <span className="text-destructive">*</span>
            </label>
            <div
              role="radiogroup"
              aria-label="Mood selection"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {ALL_MOODS.map((m) => {
                const config = MOOD_CONFIGS[m];
                const Icon = config.icon;
                const isSelected = selectedMood === m;

                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedMood(m)}
                    disabled={isSubmitting}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? `${config.badgeClassName} ring-2 ring-primary ring-offset-1`
                        : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility and Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="mood-visibility" className="text-xs font-semibold text-foreground block mb-1">
                Privacy Visibility <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('SHARED')}
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    visibility === 'SHARED'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-input bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shared</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    visibility === 'PRIVATE'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-input bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {visibility === 'SHARED'
                  ? 'Both partners can see this check-in.'
                  : 'Only you can see this check-in.'}
              </p>
            </div>

            <div>
              <label htmlFor="mood-date" className="text-xs font-semibold text-foreground block mb-1">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                id="mood-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="mood-note" className="text-xs font-semibold text-foreground">
                Journal Note <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                {note.length} / 2,000
              </span>
            </div>
            <Textarea
              id="mood-note"
              placeholder="What made you feel this way? Write any thoughts or memories..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={isSubmitting}
              className="resize-y text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Entry'
              ) : (
                'Save Entry'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
