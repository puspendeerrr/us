'use client';

import { useState, useEffect, useCallback } from 'react';
import { VoiceMemoryItem, VoicePagination } from '@/lib/voice/voice.types';
import { VoiceFilterBar, VoiceFilterOption } from './voice-filter-bar';
import { VoiceCard } from './voice-card';
import { AudioRecorderModal } from './audio-recorder-modal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { Mic, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface VoiceMemoriesClientProps {
  currentUserId: string;
}

export function VoiceMemoriesClient({ currentUserId }: VoiceMemoriesClientProps) {
  const [items, setItems] = useState<VoiceMemoryItem[]>([]);
  const [pagination, setPagination] = useState<VoicePagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VoiceFilterOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const fetchVoiceMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filter !== 'all') params.set('filter', filter.toUpperCase());
      params.set('page', currentPage.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/voice?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load voice memories');
      }

      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading voice memories');
    } finally {
      setIsLoading(false);
    }
  }, [search, filter, currentPage]);

  useEffect(() => {
    fetchVoiceMemories();
  }, [fetchVoiceMemories]);

  // Debounced search reset page
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter: VoiceFilterOption) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleUpdate = async (
    id: string,
    data: { title: string; description?: string; visibility: 'SHARED' | 'PRIVATE' }
  ) => {
    const res = await fetch(`/api/voice/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update voice memory');
    }

    const updatedRes = await res.json();
    const updated: VoiceMemoryItem = updatedRes.voiceMemory || updatedRes;
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/voice/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete voice memory');
    }

    // Refresh current view
    fetchVoiceMemories();
  };

  const handleSuccessUpload = () => {
    setIsRecordModalOpen(false);
    // Refresh to show newly uploaded memory
    setCurrentPage(1);
    fetchVoiceMemories();
  };

  const isFiltered = search.trim().length > 0 || filter !== 'all';

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <VoiceFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        filter={filter}
        onFilterChange={handleFilterChange}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        totalMemories={pagination.total}
      />

      {/* Main Content Area */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchVoiceMemories()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Loading voice memories...</p>
        </div>
      ) : items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Mic}
            title="No matching voice memories"
            description="Try modifying your search query or switching filters."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Mic}
            title="No voice memories yet"
            description="Record a spontaneous voice note or upload an audio file to share memories with your partner."
            action={
              <Button
                size="sm"
                onClick={() => setIsRecordModalOpen(true)}
                className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Mic className="w-4 h-4" />
                <span>Record / Upload Memory</span>
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Responsive Voice Memory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <VoiceCard
                key={item.id}
                memory={item}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record & Upload Modal */}
      <AudioRecorderModal
        open={isRecordModalOpen}
        onOpenChange={setIsRecordModalOpen}
        onSuccess={handleSuccessUpload}
      />
    </div>
  );
}
