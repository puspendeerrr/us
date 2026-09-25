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
import { Pencil, Loader2 } from 'lucide-react';
import type { ImportantDateItem, DateCategory } from '@/lib/dates/dates.types';

interface DateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ImportantDateItem | null;
  onUpdated: (item: ImportantDateItem) => void;
}

export function DateEditDialog({
  open,
  onOpenChange,
  item,
  onUpdated,
}: DateEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DateCategory>('ANNIVERSARY');
  const [date, setDate] = useState('');
  const [recursAnnually, setRecursAnnually] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && open) {
      setTitle(item.title);
      setDescription(item.description || '');
      setCategory(item.category);
      const d = new Date(item.originalDate);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setRecursAnnually(item.recursAnnually);
      setError(null);
    }
  }, [item, open]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    if (!date) {
      setError('Please choose a valid date.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsedUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (isNaN(parsedUtc.getTime())) {
      setError('Invalid date format.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/dates/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          category,
          date: parsedUtc.toISOString(),
          recursAnnually,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update important date');
      }

      onUpdated(data.date);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the date.');
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
              <Pencil className="w-5 h-5 text-primary" />
              <DialogTitle>Edit Important Date</DialogTitle>
            </div>
            <DialogDescription>
              Update date details, category, or annual recurrence. Changes sync immediately for both partners.
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
              <label htmlFor="edit-date-title" className="text-xs font-semibold text-foreground block mb-1">
                Title
              </label>
              <Input
                id="edit-date-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-date-category" className="text-xs font-semibold text-foreground block mb-1">
                  Category
                </label>
                <select
                  id="edit-date-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DateCategory)}
                  disabled={isSubmitting}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ANNIVERSARY" className="bg-popover text-foreground">Anniversary</option>
                  <option value="BIRTHDAY" className="bg-popover text-foreground">Birthday</option>
                  <option value="FIRST_MEET" className="bg-popover text-foreground">First Meet</option>
                  <option value="FIRST_CALL" className="bg-popover text-foreground">First Call</option>
                  <option value="FIRST_DATE" className="bg-popover text-foreground">First Date</option>
                  <option value="TRIP" className="bg-popover text-foreground">Trip</option>
                  <option value="CUSTOM" className="bg-popover text-foreground">Custom</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-date-picker" className="text-xs font-semibold text-foreground block mb-1">
                  Date
                </label>
                <Input
                  id="edit-date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-recurs-annually"
                checked={recursAnnually}
                onChange={(e) => setRecursAnnually(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <label htmlFor="edit-recurs-annually" className="text-xs font-medium text-foreground cursor-pointer select-none">
                Recurs annually (calculates next occurrence every year)
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="edit-date-description" className="text-xs font-semibold text-foreground">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {description.length} / 2,000
                </span>
              </div>
              <Textarea
                id="edit-date-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                className="resize-y text-xs min-h-[80px]"
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
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
