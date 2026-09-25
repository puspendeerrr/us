'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Lock,
  MailOpen,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Eye,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { LetterItem } from '@/lib/letters/letters.types';

interface LetterCardProps {
  letter: LetterItem;
  currentUserId: string;
  onOpenLetter: (letterId: string) => Promise<void>;
  onEdit: (letter: LetterItem) => void;
  onDelete: (letterId: string) => Promise<void>;
  onView: (letter: LetterItem) => void;
}

/**
 * Calculates a friendly display countdown based on unlockAt.
 * Only used for display - server remains authoritative.
 */
function getDisplayCountdown(unlockAtIso: string): string {
  const diffMs = new Date(unlockAtIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Ready to open';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) return `Unlocks in ${diffDays} days`;
  if (diffDays === 1) return 'Unlocks tomorrow';
  if (diffHours > 1) return `Unlocks in ${diffHours} hours`;
  if (diffHours === 1) return 'Unlocks in 1 hour';
  if (diffMin > 1) return `Unlocks in ${diffMin} minutes`;
  return 'Unlocks in less than a minute';
}

export function LetterCard({
  letter,
  currentUserId,
  onOpenLetter,
  onEdit,
  onDelete,
  onView,
}: LetterCardProps) {
  const [countdown, setCountdown] = useState<string>(() => getDisplayCountdown(letter.unlockAt));
  const [isOpening, setIsOpening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAuthor = letter.authorId === currentUserId;
  const isRecipient = letter.recipientId === currentUserId;
  const isOpened = letter.status === 'OPENED' || letter.openedAt !== null;
  const isReady = letter.status === 'READY' && !isOpened;
  const isLocked = letter.status === 'LOCKED' && !isOpened;

  // Refresh countdown timer periodically for display
  useEffect(() => {
    if (isLocked) {
      setCountdown(getDisplayCountdown(letter.unlockAt));
      const interval = setInterval(() => {
        setCountdown(getDisplayCountdown(letter.unlockAt));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLocked, letter.unlockAt]);

  const handleOpenClick = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      await onOpenLetter(letter.id);
    } finally {
      setIsOpening(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(letter.id);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-border flex flex-col justify-between transition-all hover:border-foreground/20 shadow-xs">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            {/* Title with Lock Icon if Locked */}
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {isLocked ? (
                <Lock
                  className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
                  aria-label="Locked letter"
                />
              ) : isReady ? (
                <MailOpen
                  className="w-4 h-4 text-primary shrink-0 mt-0.5"
                  aria-label="Ready to open"
                />
              ) : (
                <CheckCircle2
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                  aria-label="Opened letter"
                />
              )}
              <h3 className="text-sm font-semibold text-foreground leading-snug break-words">
                {letter.title}
              </h3>
            </div>

            {/* Author Action Menu (only if not opened) */}
            {isAuthor && !isOpened && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Letter options"
                      className="text-muted-foreground hover:text-foreground shrink-0 -mr-1"
                    />
                  }
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(letter)}>
                    <Eye className="w-3.5 h-3.5 mr-2" />
                    Preview Content
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(letter)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit Letter
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete Letter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Subtitle / Sender-Recipient metadata */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-1">
            <span>
              {isAuthor ? `To ${letter.recipientName}` : `From ${letter.authorName}`}
            </span>
            {isAuthor && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                You wrote this
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-center">
          {/* 1. LOCKED STATE */}
          {isLocked && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center space-y-2 my-auto">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground mx-auto">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Unlocks {new Date(letter.unlockAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(letter.unlockAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {countdown}
                </p>
              </div>

              {/* Author preview button if author */}
              {isAuthor && letter.content && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => onView(letter)}
                  >
                    <Eye className="w-3 h-3" />
                    View authored content
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 2. READY STATE */}
          {isReady && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-3 my-auto">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Ready to open
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Unlock moment has arrived.
                </p>
              </div>

              {isRecipient ? (
                <Button
                  onClick={handleOpenClick}
                  disabled={isOpening}
                  size="sm"
                  className="w-full gap-2 font-medium"
                >
                  {isOpening ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <MailOpen className="w-3.5 h-3.5" />
                      Open Letter
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground italic">
                    Waiting for {letter.recipientName} to open.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => onView(letter)}
                  >
                    <Eye className="w-3 h-3" />
                    View content
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. OPENED STATE */}
          {isOpened && (
            <div className="space-y-2 my-auto">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Opened{' '}
                  {letter.openedAt
                    ? new Date(letter.openedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              {/* Letter content preview */}
              <div className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-md p-3 whitespace-pre-wrap line-clamp-4 leading-relaxed font-sans">
                {letter.content || 'Content not available'}
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1 text-primary hover:text-primary"
                  onClick={() => onView(letter)}
                >
                  <Eye className="w-3 h-3" />
                  Read full letter
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Created{' '}
            {new Date(letter.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="font-medium">
            {isOpened ? (
              <span className="text-emerald-600 dark:text-emerald-400">Opened</span>
            ) : isReady ? (
              <span className="text-primary">Ready</span>
            ) : (
              <span>Locked</span>
            )}
          </span>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Letter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{letter.title}&rdquo;? This letter will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
