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
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { TIMELINE_CATEGORY_CONFIGS } from './timeline-constants';
import type { TimelineEventDetail } from '@/lib/timeline/timeline.types';

interface TimelineCardProps {
  item: TimelineEventDetail;
  onEdit: (item: TimelineEventDetail) => void;
  onDelete: (id: string) => Promise<void>;
}

export function TimelineCard({ item, onEdit, onDelete }: TimelineCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const config = TIMELINE_CATEGORY_CONFIGS[item.category];
  const Icon = config.icon;

  const eventDate = new Date(item.date);
  const formattedDate = eventDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(item.id);
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete timeline event.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-border hover:border-border/80 transition-colors bg-card/70">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 gap-1.5 ${config.badgeClassName}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3 text-muted-foreground/80" />
                  {formattedDate}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground break-words">
                {item.title}
              </h3>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Memory options"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  />
                }
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem
                  onClick={() => onEdit(item)}
                  className="gap-2 cursor-pointer"
                >
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
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3">
          {item.description && (
            <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {item.isOwn ? 'Added by you' : `Added by ${item.createdBy.displayName}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Memory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{item.title}&rdquo;? This will remove the event from your shared timeline permanently.
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
