'use client';

import { useState, useEffect, useCallback } from 'react';
import { NoteListItem, NotesPagination } from '@/lib/notes/notes.types';
import { NotesFilterBar } from './notes-filter-bar';
import { NoteCard } from './note-card';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { FileText, SearchX, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NotesClientProps {
  currentUserId: string;
}

export function NotesClient({ currentUserId }: NotesClientProps) {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [pagination, setPagination] = useState<NotesPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'shared' | 'private' | 'pinned'>('all');
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async (pageToFetch = 1) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (filter !== 'all') params.set('filter', filter);
    if (activeTag) params.set('tag', activeTag);
    params.set('page', pageToFetch.toString());
    params.set('limit', '20');

    try {
      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load notes');
      }

      const data = await res.json();
      setNotes(data.items || []);
      setPagination(data.pagination);
    } catch (err: unknown) {
      console.error('Error fetching notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [search, filter, activeTag]);

  // Debounced search / filter fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchNotes]);

  // Handle pin toggle
  const handleTogglePin = async (noteId: string, pinned: boolean) => {
    // Optimistically update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pinned } : n))
    );

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
      if (!res.ok) {
        throw new Error('Failed to update pinned state');
      }
      // Refresh list to preserve deterministic pinned-first ordering
      fetchNotes(pagination.page);
    } catch (err) {
      console.error(err);
      // Revert on error
      fetchNotes(pagination.page);
    }
  };

  const isFiltered = search.trim() !== '' || filter !== 'all' || activeTag !== undefined;

  return (
    <div className="space-y-6">
      <NotesFilterBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        activeTag={activeTag}
        onClearTag={() => setActiveTag(undefined)}
        totalNotes={pagination.total}
      />

      {error && (
        <div className="p-4 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => fetchNotes(pagination.page)}
            className="border-destructive/30 hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg border border-border/60 p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-14 w-full" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="No notes found"
            description="No notes matched your search terms or filter criteria. Try adjusting your query or resetting filters."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                  setActiveTag(undefined);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No notes yet"
            description="Keep your thoughts, memories, and shared ideas here. Create your first note to get started."
            action={
              <Link
                href="/notes/new"
                className={cn(buttonVariants({ size: 'sm' }), 'text-xs')}
              >
                Create note
              </Link>
            }
          />
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchNotes(pagination.page - 1)}
                  className="h-8 px-2 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchNotes(pagination.page + 1)}
                  className="h-8 px-2 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
