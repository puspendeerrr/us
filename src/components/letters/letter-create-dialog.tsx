'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { Loader2, Mail } from 'lucide-react';
import type { LetterItem } from '@/lib/letters/letters.types';

interface LetterCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  partnerId: string;
  onCreated: (letter: LetterItem) => void;
}

export function LetterCreateDialog({
  open,
  onOpenChange,
  partnerName,
  partnerId,
  onCreated,
}: LetterCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('20:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default date to tomorrow when dialog opens
  React.useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setUnlockDate(`${yyyy}-${mm}-${dd}`);
      setUnlockTime('20:00');
      setTitle('');
      setContent('');
      setError(null);
    }
  }, [open]);

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
    if (!unlockDate) {
      setError('Please select an unlock date.');
      return;
    }
    if (!unlockTime) {
      setError('Please select an unlock time.');
      return;
    }

    // Parse date and time in local timezone
    const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
    if (isNaN(unlockDateTime.getTime())) {
      setError('Invalid unlock date or time format.');
      return;
    }

    if (unlockDateTime.getTime() <= Date.now()) {
      setError('Unlock date and time must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          recipientId: partnerId,
          unlockAt: unlockDateTime.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create letter');
      }

      onCreated(data.letter);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the letter.');
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
              <Mail className="w-5 h-5 text-primary" />
              <DialogTitle>Write Open When Letter</DialogTitle>
            </div>
            <DialogDescription>
              Write a sealed message for your partner. It remains locked and private until the unlock moment.
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
              <label htmlFor="letter-title" className="text-xs font-semibold text-foreground block mb-1">
                Title
              </label>
              <Input
                id="letter-title"
                placeholder="e.g. Open when you need a little courage"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="letter-recipient" className="text-xs font-semibold text-foreground block mb-1">
                Recipient
              </label>
              <Input
                id="letter-recipient"
                value={`Partner (${partnerName || 'Partner'})`}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="letter-unlock-date" className="text-xs font-semibold text-foreground block mb-1">
                  Unlock Date
                </label>
                <Input
                  id="letter-unlock-date"
                  type="date"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="letter-unlock-time" className="text-xs font-semibold text-foreground block mb-1">
                  Unlock Time
                </label>
                <Input
                  id="letter-unlock-time"
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
                <label htmlFor="letter-content" className="text-xs font-semibold text-foreground">
                  Letter Content
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {content.length.toLocaleString()} / 50,000
                </span>
              </div>
              <Textarea
                id="letter-content"
                placeholder="Write your heartfelt words here. They will remain completely locked until the scheduled unlock time."
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
                  Sealing Letter...
                </>
              ) : (
                'Seal & Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
