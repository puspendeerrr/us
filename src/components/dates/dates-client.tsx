'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/layout/empty-state';
import { DateCard } from './date-card';
import { DateCreateDialog } from './date-create-dialog';
import { DateEditDialog } from './date-edit-dialog';
import {
  Calendar,
  Search,
  X,
  Plus,
  Layers,
  Clock,
  RotateCw,
  History,
  Sparkles,
  Loader2,
  Filter,
} from 'lucide-react';
import type { ImportantDateItem, DateCategory } from '@/lib/dates/dates.types';

interface DatesClientProps {
  initialItems: ImportantDateItem[];
  initialTotal: number;
  currentUserId: string;
}

export function DatesClient({
  initialItems,
  initialTotal,
  currentUserId,
}: DatesClientProps) {
  const [items, setItems] = useState<ImportantDateItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);

  const [tab, setTab] = useState<'all' | 'upcoming' | 'today' | 'recurring' | 'past'>('all');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ImportantDateItem | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch dates on filter/search change
  const fetchDates = useCallback(
    async (
      currentTab: 'all' | 'upcoming' | 'today' | 'recurring' | 'past',
      currentCategory: string,
      query: string
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentTab !== 'all') {
          params.set('tab', currentTab);
        }
        if (currentCategory !== 'ALL') {
          params.set('category', currentCategory);
        }
        if (query) {
          params.set('search', query);
        }

        const res = await fetch(`/api/dates?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch dates');
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        console.error('Error fetching dates:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchDates(tab, category, debouncedSearch);
  }, [tab, category, debouncedSearch, fetchDates]);

  // Handlers
  const handleCreated = (newItem: ImportantDateItem) => {
    setItems((prev) => [newItem, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const handleUpdated = (updatedItem: ImportantDateItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/dates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete date');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Could not delete date.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search dates by title or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Add Date Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add Important Date</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-border/40">
          {/* Tab Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Dates</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'upcoming'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Upcoming</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('today')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'today'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('recurring')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'recurring'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Annual</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('past')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'past'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Past</span>
            </button>
          </div>

          {/* Category Dropdown & Total Count */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL" className="bg-popover text-foreground">All Categories</option>
                <option value="ANNIVERSARY" className="bg-popover text-foreground">Anniversary</option>
                <option value="BIRTHDAY" className="bg-popover text-foreground">Birthday</option>
                <option value="FIRST_MEET" className="bg-popover text-foreground">First Meet</option>
                <option value="FIRST_CALL" className="bg-popover text-foreground">First Call</option>
                <option value="FIRST_DATE" className="bg-popover text-foreground">First Date</option>
                <option value="TRIP" className="bg-popover text-foreground">Trip</option>
                <option value="CUSTOM" className="bg-popover text-foreground">Custom</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              <span>{total} {total === 1 ? 'date' : 'dates'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading dates...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={
            debouncedSearch
              ? 'No matching dates'
              : tab === 'today'
              ? 'No dates today'
              : tab === 'upcoming'
              ? 'No upcoming dates'
              : tab === 'past'
              ? 'No past events'
              : tab === 'recurring'
              ? 'No annual recurring dates'
              : 'No important dates yet'
          }
          description={
            debouncedSearch
              ? `No dates matching "${debouncedSearch}". Try a different search term.`
              : tab === 'today'
              ? 'No relationship anniversaries or milestones scheduled for today.'
              : 'Add your anniversaries, birthdays, first meeting, and trips to track countdowns.'
          }
          action={
            !debouncedSearch && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Date</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <DateCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onEdit={(d) => setEditingItem(d)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <DateCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleCreated}
      />

      {/* Edit Dialog */}
      <DateEditDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
