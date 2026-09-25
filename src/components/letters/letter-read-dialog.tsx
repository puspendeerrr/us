'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import type { LetterItem } from '@/lib/letters/letters.types';

interface LetterReadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: LetterItem | null;
}

export function LetterReadDialog({
  open,
  onOpenChange,
  letter,
}: LetterReadDialogProps) {
  if (!letter) return null;

  const isOpened = letter.status === 'OPENED' || letter.openedAt !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold leading-snug">
                {letter.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  From {letter.authorName}
                </span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1">
                  To {letter.recipientName}
                </span>
              </div>
            </div>
            <div>
              {isOpened ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs shrink-0"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Opened
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs shrink-0">
                  <Clock className="w-3 h-3" />
                  {letter.status}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Read letter titled {letter.title}
          </DialogDescription>
        </DialogHeader>

        {/* Date metadata */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground py-2 px-1 border-b bg-muted/20 -mx-4 px-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span>
              Unlocks: {new Date(letter.unlockAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          {letter.openedAt && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                Opened: {new Date(letter.openedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Letter Body */}
        <div className="flex-1 overflow-y-auto py-4 px-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {letter.content ? (
            letter.content
          ) : (
            <div className="text-center py-8 text-muted-foreground italic text-xs">
              This letter is sealed and locked.
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
