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
import { Clock, Loader2 } from 'lucide-react';
import {
  TIMELINE_CATEGORY_CONFIGS,
  ALL_TIMELINE_CATEGORIES,
} from './timeline-constants';
import type {
  TimelineEventDetail,
  TimelineCategory,
} from '@/lib/timeline/timeline.types';

interface TimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: TimelineEventDetail | null;
  onSaved: (item: TimelineEventDetail) => void;
}

export function TimelineDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: TimelineDialogProps) {
  const isEditing = !!item;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TimelineCategory>('MEMORY');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title);
        setDescription(item.description || '');
        setCategory(item.category);
        const itemDate = new Date(item.date);
        const yyyy = itemDate.getFullYear();
        const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
        const dd = String(itemDate.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setTitle('');
        setDescription('');
        setCategory('MEMORY');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
      }
      setError(null);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setError('Title cannot exceed 200 characters.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    if (description.length > 3000) {
      setError('Description cannot exceed 3000 characters.');
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
      const url = isEditing ? `/api/timeline/${item.id}` : '/api/timeline';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || undefined,
          date: parsedDate.toISOString(),
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save timeline event.');
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
              <Clock className="w-5 h-5 text-primary" />
              <DialogTitle>
                {isEditing ? 'Edit Memory' : 'Add Timeline Memory'}
              </DialogTitle>
            </div>
            <DialogDescription>
              {isEditing
                ? 'Update this milestone or memory in your relationship timeline.'
                : 'Document a meaningful event, trip, or milestone in our journey.'}
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

          <div className="space-y-3">
            <div>
              <label
                htmlFor="timeline-title"
                className="text-xs font-semibold text-foreground block mb-1"
              >
                Event Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="timeline-title"
                placeholder="e.g. Our First Road Trip, Moving in Together"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="timeline-category"
                  className="text-xs font-semibold text-foreground block mb-1"
                >
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  id="timeline-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as TimelineCategory)
                  }
                  disabled={isSubmitting}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ALL_TIMELINE_CATEGORIES.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      className="bg-popover text-foreground"
                    >
                      {TIMELINE_CATEGORY_CONFIGS[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="timeline-date"
                  className="text-xs font-semibold text-foreground block mb-1"
                >
                  Event Date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="timeline-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="timeline-description"
                  className="text-xs font-semibold text-foreground"
                >
                  Story / Description{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {description.length} / 3,000
                </span>
              </div>
              <Textarea
                id="timeline-description"
                placeholder="What happened? Write down your thoughts, funny details, or special moments..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={3000}
                disabled={isSubmitting}
                className="resize-y text-xs min-h-[90px]"
              />
            </div>
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
                'Save Changes'
              ) : (
                'Add Memory'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
