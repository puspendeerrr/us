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
import type { BucketItemDetail, BucketCategory } from '@/lib/bucket-list/bucket-list.types';

interface BucketEditDialogProps {
  item: BucketItemDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (item: BucketItemDetail) => void;
}

const CATEGORY_OPTIONS: { label: string; value: BucketCategory }[] = [
  { label: 'Travel', value: 'TRAVEL' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Experiences', value: 'EXPERIENCES' },
  { label: 'Movies', value: 'MOVIES' },
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Adventure', value: 'ADVENTURE' },
  { label: 'Personal', value: 'PERSONAL' },
  { label: 'Custom', value: 'CUSTOM' },
];

export function BucketEditDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
}: BucketEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BucketCategory>('TRAVEL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && open) {
      setTitle(item.title);
      setDescription(item.description || '');
      setCategory(item.category);
      setError(null);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

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

    if (description.length > 2000) {
      setError('Description cannot exceed 2000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bucket-list/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || undefined,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update bucket item.');
      }

      onUpdated(data.item);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the item.');
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
              <DialogTitle>Edit Bucket Item</DialogTitle>
            </div>
            <DialogDescription>
              Update the details, title, or category for this bucket list item.
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
              <label htmlFor="edit-bucket-title" className="text-xs font-semibold text-foreground block mb-1">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-bucket-title"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="edit-bucket-category" className="text-xs font-semibold text-foreground block mb-1">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                id="edit-bucket-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BucketCategory)}
                disabled={isSubmitting}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-popover text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="edit-bucket-description" className="text-xs font-semibold text-foreground">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {description.length} / 2,000
                </span>
              </div>
              <Textarea
                id="edit-bucket-description"
                placeholder="Add details, steps, or notes about this bucket list item..."
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
