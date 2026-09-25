'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/layout/empty-state';
import { BucketProgressCard } from './bucket-progress-card';
import { BucketCard } from './bucket-card';
import { BucketCreateDialog } from './bucket-create-dialog';
import { BucketEditDialog } from './bucket-edit-dialog';
import {
  CheckSquare,
  Search,
  X,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  BucketItemDetail,
  BucketProgress,
  BucketCategory,
} from '@/lib/bucket-list/bucket-list.types';

interface BucketClientProps {
  initialItems: BucketItemDetail[];
  initialProgress: BucketProgress;
  currentUserId: string;
}

const CATEGORY_FILTERS: { label: string; value: string }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Travel', value: 'TRAVEL' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Experiences', value: 'EXPERIENCES' },
  { label: 'Movies', value: 'MOVIES' },
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Adventure', value: 'ADVENTURE' },
  { label: 'Personal', value: 'PERSONAL' },
  { label: 'Custom', value: 'CUSTOM' },
];

export function BucketClient({
  initialItems,
  initialProgress,
  currentUserId,
}: BucketClientProps) {
  const [items, setItems] = useState<BucketItemDetail[]>(initialItems);
  const [progress, setProgress] = useState<BucketProgress>(initialProgress);

  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BucketItemDetail | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch bucket items from server
  const fetchBucketItems = useCallback(
    async (
      currentStatus: 'all' | 'active' | 'completed',
      currentCategory: string,
      query: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentStatus !== 'all') {
          params.set('status', currentStatus);
        }
        if (currentCategory !== 'ALL') {
          params.set('category', currentCategory);
        }
        if (query) {
          params.set('search', query);
        }

        const res = await fetch(`/api/bucket-list?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Unable to load bucket list.');
        }

        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setProgress(data.progress);
        }
      } catch (err: any) {
        console.error('Error fetching bucket items:', err);
        setError(err.message || 'Unable to load bucket list.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBucketItems(status, category, debouncedSearch);
  }, [status, category, debouncedSearch, fetchBucketItems]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('ALL');
  };

  // Create handler
  const handleCreated = async () => {
    await fetchBucketItems(status, category, debouncedSearch);
  };

  // Edit handler
  const handleUpdated = (updatedItem: BucketItemDetail) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  // Complete / Uncomplete toggle handler
  const handleToggleComplete = async (id: string, nextCompleted: boolean) => {
    setError(null);
    try {
      const res = await fetch(`/api/bucket-list/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            (nextCompleted
              ? 'Unable to complete item.'
              : 'Unable to uncomplete item.')
        );
      }

      // Refresh list to update ordering and progress deterministically
      await fetchBucketItems(status, category, debouncedSearch);
    } catch (err: any) {
      console.error('Toggle complete error:', err);
      setError(
        err.message ||
          (nextCompleted
            ? 'Unable to complete item.'
            : 'Unable to uncomplete item.')
      );
      throw err;
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/bucket-list/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to delete item.');
      }

      // Refresh list to recalculate progress and items from server
      await fetchBucketItems(status, category, debouncedSearch);
    } catch (err: any) {
      console.error('Delete bucket item error:', err);
      setError(err.message || 'Unable to delete item.');
      throw err;
    }
  };

  const isFiltered =
    status !== 'all' || category !== 'ALL' || debouncedSearch.length > 0;

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      <BucketProgressCard progress={progress} />

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Controls & Filters Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
              aria-label="Search bucket list items"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add item button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 shrink-0 h-9 text-xs"
          >
            <Plus className="w-4 h-4" />
            Add item
          </Button>
        </div>

        {/* Status & Category filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Status Tabs */}
          <div
            role="tablist"
            aria-label="Filter items by completion status"
            className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs"
          >
            <button
              role="tab"
              aria-selected={status === 'all'}
              onClick={() => setStatus('all')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                status === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              role="tab"
              aria-selected={status === 'active'}
              onClick={() => setStatus('active')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                status === 'active'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              role="tab"
              aria-selected={status === 'completed'}
              onClick={() => setStatus('completed')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                status === 'completed'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter items by category"
              className="flex h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORY_FILTERS.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-popover text-foreground">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content / Grid / Loading / Empty states */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading bucket list...</span>
        </div>
      ) : items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            title="No matching items found."
            description="Try changing your search term or filter options."
            action={
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={CheckSquare}
            title="Bucket List is empty."
            description="Add the things you both want to experience."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first item
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <BucketCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onToggleComplete={handleToggleComplete}
              onEdit={(it) => setEditingItem(it)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <BucketCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleCreated}
      />

      {/* Edit Dialog */}
      <BucketEditDialog
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
