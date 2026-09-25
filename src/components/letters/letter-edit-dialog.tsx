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
import { Loader2, Pencil } from 'lucide-react';
import type { LetterItem } from '@/lib/letters/letters.types';

interface LetterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: LetterItem | null;
  onUpdated: (letter: LetterItem) => void;
}

export function LetterEditDialog({
  open,
  onOpenChange,
  letter,
  onUpdated,
}: LetterEditDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (letter && open) {
      setTitle(letter.title);
      setContent(letter.content || '');
      const d = new Date(letter.unlockAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setUnlockDate(`${yyyy}-${mm}-${dd}`);
      setUnlockTime(`${hh}:${min}`);
      setError(null);
    }
  }, [letter, open]);

  if (!letter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Letter title is required.');
      return;
    }
    if (!trimmedContent) {
      setError('Letter content is required.');
      return;
    }
    if (!unlockDate || !unlockTime) {
      setError('Please select unlock date and time.');
      return;
    }

    const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
    if (isNaN(unlockDateTime.getTime())) {
      setError('Invalid unlock date/time format.');
      return;
    }

    if (unlockDateTime.getTime() <= Date.now()) {
      setError('Unlock date and time must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/letters/${letter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          unlockAt: unlockDateTime.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update letter');
      }

      onUpdated(data.letter);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the letter.');
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
              <DialogTitle>Edit Open When Letter</DialogTitle>
            </div>
            <DialogDescription>
              Modify your letter before it has been opened. Once opened, letters become permanent and immutable.
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
              <label htmlFor="edit-title" className="text-xs font-semibold text-foreground block mb-1">
                Title
              </label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-unlock-date" className="text-xs font-semibold text-foreground block mb-1">
                  Unlock Date
                </label>
                <Input
                  id="edit-unlock-date"
                  type="date"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="edit-unlock-time" className="text-xs font-semibold text-foreground block mb-1">
                  Unlock Time
                </label>
                <Input
                  id="edit-unlock-time"
                  type="time"
                  value={unlockTime}
                  onChange={(e) => setUnlockTime(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="edit-content" className="text-xs font-semibold text-foreground">
                  Letter Content
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {content.length.toLocaleString()} / 50,000
                </span>
              </div>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                maxLength={50000}
                required
                disabled={isSubmitting}
                className="resize-y min-h-[140px]"
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
                  Saving Changes...
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
