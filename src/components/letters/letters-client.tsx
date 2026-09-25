'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/layout/empty-state';
import { LetterCard } from './letter-card';
import { LetterCreateDialog } from './letter-create-dialog';
import { LetterEditDialog } from './letter-edit-dialog';
import { LetterReadDialog } from './letter-read-dialog';
import {
  Mail,
  Search,
  X,
  Plus,
  Inbox,
  Send,
  Layers,
  Loader2,
} from 'lucide-react';
import type { LetterItem } from '@/lib/letters/letters.types';

interface LettersClientProps {
  initialItems: LetterItem[];
  initialTotal: number;
  initialHasMore: boolean;
  initialNextCursor: string | null;
  currentUserId: string;
  partnerName: string;
  partnerId: string;
}

export function LettersClient({
  initialItems,
  initialTotal,
  initialHasMore,
  initialNextCursor,
  currentUserId,
  partnerName,
  partnerId,
}: LettersClientProps) {
  const [items, setItems] = useState<LetterItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);

  const [tab, setTab] = useState<'all' | 'received' | 'sent'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LetterItem | null>(null);
  const [readingLetter, setReadingLetter] = useState<LetterItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch letters when tab or debouncedSearch changes
  const fetchLetters = useCallback(
    async (currentTab: 'all' | 'received' | 'sent', query: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('tab', currentTab);
        if (query) {
          params.set('search', query);
        }

        const res = await fetch(`/api/letters?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch letters');
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotal(data.total);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        console.error('Error fetching letters:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger refetch on filter change (skip first render if initial matches)
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchLetters(tab, debouncedSearch);
  }, [tab, debouncedSearch, fetchLetters]);

  // Load more pagination
  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      params.set('cursor', nextCursor);

      const res = await fetch(`/api/letters?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load more letters');
      const data = await res.json();
      if (data.success) {
        setItems((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error('Error loading more letters:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Open letter action
  const handleOpenLetter = async (letterId: string) => {
    try {
      const res = await fetch(`/api/letters/${letterId}/open`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to open letter');
      }

      const openedItem: LetterItem = data.letter;
      // Update item in list
      setItems((prev) =>
        prev.map((item) => (item.id === openedItem.id ? openedItem : item))
      );
      // Open reading dialog immediately
      setReadingLetter(openedItem);
    } catch (err: any) {
      alert(err.message || 'Could not open letter.');
    }
  };

  // Delete letter action
  const handleDeleteLetter = async (letterId: string) => {
    try {
      const res = await fetch(`/api/letters/${letterId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete letter');
      }

      setItems((prev) => prev.filter((item) => item.id !== letterId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Could not delete letter.');
    }
  };

  // Callback on newly created letter
  const handleCreated = (newLetter: LetterItem) => {
    if (tab === 'all' || tab === 'sent') {
      setItems((prev) => [newLetter, ...prev]);
    }
    setTotal((prev) => prev + 1);
  };

  // Callback on updated letter
  const handleUpdated = (updatedLetter: LetterItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedLetter.id ? updatedLetter : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Title search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search letters by title..."
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

          {/* Write Letter Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Write Letter</span>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
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
              <span>All Letters</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('received')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'received'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Received</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('sent')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'sent'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Written by Me</span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            <span>
              {total} {total === 1 ? 'letter' : 'letters'}
            </span>
          </div>
        </div>
      </div>

      {/* Letters List / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading letters...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={
            debouncedSearch
              ? 'No matching letters'
              : tab === 'received'
              ? 'No received letters'
              : tab === 'sent'
              ? 'No letters written yet'
              : 'No letters yet'
          }
          description={
            debouncedSearch
              ? `No letters matching "${debouncedSearch}". Try a different search title.`
              : tab === 'received'
              ? `When ${partnerName || 'your partner'} writes a letter for you, it will appear here.`
              : tab === 'sent'
              ? 'Write a sealed letter for your partner to be unlocked at a special moment.'
              : 'Open When Letters remain securely locked until their configured unlock date and time.'
          }
          action={
            !debouncedSearch && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write First Letter</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                currentUserId={currentUserId}
                onOpenLetter={handleOpenLetter}
                onEdit={(l) => setEditingLetter(l)}
                onDelete={handleDeleteLetter}
                onView={(l) => setReadingLetter(l)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs gap-2 min-w-[120px]"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Letters'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <LetterCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        partnerName={partnerName}
        partnerId={partnerId}
        onCreated={handleCreated}
      />

      {/* Edit Dialog */}
      <LetterEditDialog
        open={!!editingLetter}
        onOpenChange={(open) => {
          if (!open) setEditingLetter(null);
        }}
        letter={editingLetter}
        onUpdated={handleUpdated}
      />

      {/* Read / View Dialog */}
      <LetterReadDialog
        open={!!readingLetter}
        onOpenChange={(open) => {
          if (!open) setReadingLetter(null);
        }}
        letter={readingLetter}
      />
    </div>
  );
}
