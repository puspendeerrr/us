'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Lock,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { MOOD_CONFIGS } from './mood-constants';
import type { MoodEntryDetail } from '@/lib/moods/mood.types';

interface MoodCardProps {
  item: MoodEntryDetail;
  onEdit: (item: MoodEntryDetail) => void;
  onDelete: (id: string) => Promise<void>;
}

export function MoodCard({ item, onEdit, onDelete }: MoodCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const config = MOOD_CONFIGS[item.mood];
  const Icon = config.icon;

  const itemDate = new Date(item.date);
  const dateFormatted = itemDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const createdTime = new Date(item.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(item.id);
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete mood entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-border hover:border-border/80 transition-colors">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs font-semibold px-2.5 py-1 gap-1.5 ${config.badgeClassName}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </Badge>

              {item.isOwn ? (
                item.visibility === 'PRIVATE' ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 border-muted">
                    <Lock className="w-2.5 h-2.5" />
                    Private
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 border-muted">
                    <Users className="w-2.5 h-2.5" />
                    Shared
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 border-muted">
                  <Users className="w-2.5 h-2.5" />
                  Shared by {item.createdBy.displayName}
                </Badge>
              )}
            </div>

            {/* Actions menu: only author can edit or delete */}
            {item.isOwn && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Mood entry options"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    />
                  }
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="gap-2 text-destructive cursor-pointer focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2.5">
          {item.note && (
            <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {item.note}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dateFormatted}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {createdTime}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mood Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {config.label.toLowerCase()} mood entry from{' '}
              {dateFormatted}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
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
