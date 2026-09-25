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
  Check,
  CheckCircle2,
  Square,
  MoreVertical,
  Pencil,
  Trash2,
  Plane,
  Utensils,
  Sparkles,
  Film,
  BookOpen,
  Compass,
  User,
  Bookmark,
  Loader2,
  Calendar,
} from 'lucide-react';
import type { BucketItemDetail, BucketCategory } from '@/lib/bucket-list/bucket-list.types';

interface BucketCardProps {
  item: BucketItemDetail;
  currentUserId: string;
  onToggleComplete: (id: string, nextCompleted: boolean) => Promise<void>;
  onEdit: (item: BucketItemDetail) => void;
  onDelete: (id: string) => Promise<void>;
}

function getCategoryIcon(category: BucketCategory) {
  switch (category) {
    case 'TRAVEL':
      return Plane;
    case 'FOOD':
      return Utensils;
    case 'EXPERIENCES':
      return Sparkles;
    case 'MOVIES':
      return Film;
    case 'LEARNING':
      return BookOpen;
    case 'ADVENTURE':
      return Compass;
    case 'PERSONAL':
      return User;
    case 'CUSTOM':
    default:
      return Bookmark;
  }
}

function formatCategoryLabel(category: BucketCategory): string {
  switch (category) {
    case 'TRAVEL':
      return 'Travel';
    case 'FOOD':
      return 'Food';
    case 'EXPERIENCES':
      return 'Experiences';
    case 'MOVIES':
      return 'Movies';
    case 'LEARNING':
      return 'Learning';
    case 'ADVENTURE':
      return 'Adventure';
    case 'PERSONAL':
      return 'Personal';
    case 'CUSTOM':
      return 'Custom';
    default:
      return category;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BucketCard({
  item,
  currentUserId,
  onToggleComplete,
  onEdit,
  onDelete,
}: BucketCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const CategoryIcon = getCategoryIcon(item.category);

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleComplete(item.id, !item.isCompleted);
    } finally {
      setIsToggling(false);
    }
  };

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
          item.isCompleted ? 'bg-muted/15 border-border/60' : ''
        }`}
      >
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-start justify-between gap-2">
            {/* Category Badge */}
            <Badge
              variant="outline"
              className="gap-1 text-xs py-0.5 px-2 bg-muted/40 font-normal border-border/80"
            >
              <CategoryIcon className="w-3 h-3 text-primary" />
              <span>{formatCategoryLabel(item.category)}</span>
            </Badge>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Options"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  />
                }
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit Item
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3
            className={`text-base font-semibold leading-snug break-words ${
              item.isCompleted
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            }`}
          >
            {item.title}
          </h3>
        </CardHeader>

        <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-between space-y-3">
          {/* Description */}
          {item.description ? (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <div />
          )}

          {/* Completion Status Control */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleToggle}
              disabled={isToggling}
              className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                item.isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                  : 'bg-muted/40 border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                {isToggling ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : item.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span>{item.isCompleted ? 'Completed' : 'Not completed'}</span>
              </div>

              {item.isCompleted && item.completedAt && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  {formatDate(item.completedAt)}
                </span>
              )}
            </button>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Added by {item.createdBy.displayName}</span>
          <span>
            {item.isCompleted && item.completedAt
              ? `Done ${formatDate(item.completedAt)}`
              : formatDate(item.createdAt)}
          </span>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bucket Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{item.title}&rdquo;? This will remove the item from your shared bucket list.
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
                'Delete Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
