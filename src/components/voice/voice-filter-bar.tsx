'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Mic, Layers, Users, Lock, User as UserIcon } from 'lucide-react';

export type VoiceFilterOption = 'all' | 'shared' | 'private' | 'mine';

interface VoiceFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  filter: VoiceFilterOption;
  onFilterChange: (filter: VoiceFilterOption) => void;
  onOpenRecordModal: () => void;
  totalMemories: number;
}



export function VoiceFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onOpenRecordModal,
  totalMemories,
}: VoiceFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search voice memories by title or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            onClick={onOpenRecordModal}
            className="h-9 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Mic className="h-4 w-4" />
            <span>Record / Upload</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Memories</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('shared')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'shared'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Shared</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('private')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'private'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>My Private</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('mine')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'mine'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Recorded by Me</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          <span>{totalMemories} {totalMemories === 1 ? 'recording' : 'recordings'}</span>
        </div>
      </div>
    </div>
  );
}
