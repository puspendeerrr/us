'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/layout/empty-state';
import { TodayCheckinCard } from './today-checkin-card';
import { MoodCard } from './mood-card';
import { MoodDialog } from './mood-dialog';
import { MOOD_CONFIGS, ALL_MOODS } from './mood-constants';
import {
  Smile,
  Search,
  X,
  Plus,
  Filter,
  Loader2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { MoodEntryDetail, MoodType } from '@/lib/moods/mood.types';

interface MoodClientProps {
  initialItems: MoodEntryDetail[];
  initialTotal: number;
  currentUserId: string;
}

export function MoodClient({
  initialItems,
  initialTotal,
  currentUserId,
}: MoodClientProps) {
  const [items, setItems] = useState<MoodEntryDetail[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);

  // Filters
  const [moodFilter, setMoodFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MoodEntryDetail | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Compute today's check-in for current user
  const todayEntry = React.useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return (
      items.find(
        (it) => it.isOwn && it.date.slice(0, 10) === todayStr
      ) || null
    );
  }, [items]);

  // Fetch entries from server
  const fetchMoodEntries = useCallback(
    async (
      currentMood: string,
      currentVisibility: string,
      currentDate: string,
      query: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentMood !== 'ALL') {
          params.set('mood', currentMood);
        }
        if (currentVisibility !== 'ALL') {
          params.set('visibility', currentVisibility);
        }
        if (currentDate) {
          params.set('date', currentDate);
        }
        if (query) {
          params.set('search', query);
        }

        const res = await fetch(`/api/moods?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch mood entries.');
        }

        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err: any) {
        console.error('Error fetching mood entries:', err);
        setError(err.message || 'Unable to load mood journal.');
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
    fetchMoodEntries(moodFilter, visibilityFilter, dateFilter, debouncedSearch);
  }, [moodFilter, visibilityFilter, dateFilter, debouncedSearch, fetchMoodEntries]);

  const handleResetFilters = () => {
    setMoodFilter('ALL');
    setVisibilityFilter('ALL');
    setDateFilter('');
    setSearch('');
  };

  const handleSaved = async () => {
    await fetchMoodEntries(moodFilter, visibilityFilter, dateFilter, debouncedSearch);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/moods/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete mood entry.');
      }

      await fetchMoodEntries(moodFilter, visibilityFilter, dateFilter, debouncedSearch);
    } catch (err: any) {
      console.error('Delete mood error:', err);
      setError(err.message || 'Unable to delete mood entry.');
      throw err;
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MoodEntryDetail) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const isFiltered =
    moodFilter !== 'ALL' ||
    visibilityFilter !== 'ALL' ||
    dateFilter.length > 0 ||
    debouncedSearch.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Today's Check-In Banner */}
      <TodayCheckinCard
        todayEntry={todayEntry}
        onLogClick={handleOpenCreate}
        onEditClick={handleOpenEdit}
      />

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

      {/* 2. Controls & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Note search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
              aria-label="Search journal notes"
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

          {/* Add Mood Button */}
          <Button
            onClick={handleOpenCreate}
            className="gap-2 shrink-0 h-9 text-xs"
          >
            <Plus className="w-4 h-4" />
            Log Mood
          </Button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mood selector */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
              <select
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                aria-label="Filter by mood"
                className="flex h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL" className="bg-popover text-foreground">All Moods</option>
                {ALL_MOODS.map((m) => (
                  <option key={m} value={m} className="bg-popover text-foreground">
                    {MOOD_CONFIGS[m].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility selector */}
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              aria-label="Filter by visibility"
              className="flex h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL" className="bg-popover text-foreground">All Visibility</option>
              <option value="SHARED" className="bg-popover text-foreground">Shared Only</option>
              <option value="PRIVATE" className="bg-popover text-foreground">Private to Me</option>
            </select>
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
              className="h-8 w-auto text-xs"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter('')}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Date
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Mood Feed / List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading journal...</span>
        </div>
      ) : items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            title="No mood entries found."
            description="Try adjusting your mood, visibility, or date filters."
            action={
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Smile}
            title="Your Mood Journal is empty."
            description="Log your daily feelings to share emotional closeness and track your mood over time."
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Log your first mood
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <MoodCard
              key={item.id}
              item={item}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 4. Create / Edit Dialog */}
      <MoodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        onSaved={handleSaved}
      />
    </div>
  );
}
