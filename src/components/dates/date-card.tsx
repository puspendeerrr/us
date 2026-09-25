'use client';

import * as React from 'react';
import { useState } from 'react';
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
  Calendar,
  RotateCw,
  MoreVertical,
  Pencil,
  Trash2,
  Cake,
  Phone,
  Coffee,
  Plane,
  Bookmark,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';
import type { ImportantDateItem, DateCategory } from '@/lib/dates/dates.types';
import { formatCategoryLabel } from '@/lib/dates/dates.utils';

interface DateCardProps {
  item: ImportantDateItem;
  currentUserId: string;
  onEdit: (item: ImportantDateItem) => void;
  onDelete: (id: string) => Promise<void>;
}

function getCategoryIcon(category: DateCategory) {
  switch (category) {
    case 'ANNIVERSARY':
      return Sparkles;
    case 'BIRTHDAY':
      return Cake;
    case 'FIRST_MEET':
      return Sparkles;
    case 'FIRST_CALL':
      return Phone;
    case 'FIRST_DATE':
      return Coffee;
    case 'TRIP':
      return Plane;
    case 'CUSTOM':
    default:
      return Bookmark;
  }
}

function formatDateDisplay(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function DateCard({ item, currentUserId, onEdit, onDelete }: DateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const CategoryIcon = getCategoryIcon(item.category);

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={`border-border flex flex-col justify-between transition-all hover:border-foreground/20 shadow-xs ${
          item.isToday
            ? 'ring-1 ring-emerald-500/50 dark:ring-emerald-400/40 bg-emerald-500/5'
            : ''
        }`}
      >
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-start justify-between gap-2">
            {/* Category Badge & Icon */}
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="gap-1 text-xs py-0.5 px-2 bg-muted/40 font-normal border-border/80"
              >
                <CategoryIcon className="w-3 h-3 text-primary" />
                <span>{formatCategoryLabel(item.category)}</span>
              </Badge>
              {item.recursAnnually && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-[10px] py-0 px-1.5 h-4 font-normal text-muted-foreground"
                  title="Recurs annually"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  <span>Annual</span>
                </Badge>
              )}
            </div>

            {/* Actions Menu */}
            <div className="flex items-center gap-1">
              {item.isToday ? (
                <Badge className="bg-emerald-600 dark:bg-emerald-500 text-white font-semibold text-xs tracking-wide px-2 py-0.5">
                  Today
                </Badge>
              ) : item.isPast ? (
                <Badge variant="outline" className="text-muted-foreground text-xs py-0.5 px-2">
                  Past
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary bg-primary/5 text-xs font-semibold py-0.5 px-2"
                >
                  {item.daysUntil === 1 ? 'Tomorrow' : `In ${item.daysUntil} days`}
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Options"
                      className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                    />
                  }
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit Date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete Date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-foreground leading-snug break-words pt-1">
            {item.title}
          </h3>
        </CardHeader>

        <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-between space-y-3">
          {/* Description */}
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Date Details Box */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Original:</span>
              </span>
              <span className="font-medium text-foreground">
                {formatDateDisplay(item.originalDate)}
              </span>
            </div>

            {item.recursAnnually && item.nextOccurrence && (
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <RotateCw className="w-3 h-3" />
                  <span>Next:</span>
                </span>
                <span className="font-semibold text-foreground">
                  {formatDateDisplay(item.nextOccurrence)}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Added by {item.createdBy.displayName}</span>
          <span className="font-medium">
            {item.isToday ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Today</span>
            ) : item.isPast ? (
              <span>Past event</span>
            ) : (
              <span>{item.daysUntil} days remaining</span>
            )}
          </span>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Important Date</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{item.title}&rdquo;? This will remove the date for both partners.
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
                'Delete Date'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
