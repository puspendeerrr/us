'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/layout/empty-state';
import { TimelineCard } from './timeline-card';
import { TimelineDialog } from './timeline-dialog';
import {
  TIMELINE_CATEGORY_CONFIGS,
  ALL_TIMELINE_CATEGORIES,
} from './timeline-constants';
import {
  Clock,
  Search,
  X,
  Plus,
  Filter,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  TimelineEventDetail,
  TimelineCategory,
} from '@/lib/timeline/timeline.types';

interface TimelineClientProps {
  initialItems: TimelineEventDetail[];
  initialTotal: number;
  currentUserId: string;
}

export function TimelineClient({
  initialItems,
  initialTotal,
  currentUserId,
}: TimelineClientProps) {
  const [items, setItems] = useState<TimelineEventDetail[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineEventDetail | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch timeline events
  const fetchTimeline = useCallback(
    async (
      currentCategory: string,
      currentOrder: 'desc' | 'asc',
      query: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentCategory !== 'ALL') {
          params.set('category', currentCategory);
        }
        params.set('order', currentOrder);
        if (query) {
          params.set('search', query);
        }

        const res = await fetch(`/api/timeline?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch timeline events.');
        }

        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err: any) {
        console.error('Error fetching timeline events:', err);
        setError(err.message || 'Unable to load relationship timeline.');
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
    fetchTimeline(categoryFilter, order, debouncedSearch);
  }, [categoryFilter, order, debouncedSearch, fetchTimeline]);

  const handleResetFilters = () => {
    setCategoryFilter('ALL');
    setOrder('desc');
    setSearch('');
  };

  const handleSaved = async () => {
    await fetchTimeline(categoryFilter, order, debouncedSearch);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/timeline/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete timeline event.');
      }

      await fetchTimeline(categoryFilter, order, debouncedSearch);
    } catch (err: any) {
      console.error('Delete timeline error:', err);
      setError(err.message || 'Unable to delete timeline event.');
      throw err;
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: TimelineEventDetail) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const toggleOrder = () => {
    setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const isFiltered = categoryFilter !== 'ALL' || debouncedSearch.length > 0;

  return (
    <div className="space-y-6">
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

      {/* Controls & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search memories by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
              aria-label="Search relationship timeline"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Memory Button */}
          <Button
            onClick={handleOpenCreate}
            className="gap-2 shrink-0 h-9 text-xs"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </Button>
        </div>

        {/* Filters and Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter timeline by category"
              className="flex h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL" className="bg-popover text-foreground">
                All Categories
              </option>
              {ALL_TIMELINE_CATEGORIES.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  className="bg-popover text-foreground"
                >
                  {TIMELINE_CATEGORY_CONFIGS[cat].label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleOrder}
            className="gap-1.5 text-xs h-8"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{order === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </Button>
        </div>
      </div>

      {/* Main Timeline Events Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">
            Loading timeline...
          </span>
        </div>
      ) : items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            title="No timeline events found."
            description="Try adjusting your search query or category filter."
            action={
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Clock}
            title="Our Story is empty"
            description="Add your first memory to begin documenting your journey together."
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first memory
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <TimelineCard
              key={item.id}
              item={item}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <TimelineDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        onSaved={handleSaved}
      />
    </div>
  );
}
