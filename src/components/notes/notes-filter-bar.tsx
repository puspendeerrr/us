'use client';

import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Plus, Pin, Lock, Globe, Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NotesFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  filter: 'all' | 'shared' | 'private' | 'pinned';
  onFilterChange: (filter: 'all' | 'shared' | 'private' | 'pinned') => void;
  activeTag?: string;
  onClearTag?: () => void;
  totalNotes: number;
}

export function NotesFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  activeTag,
  onClearTag,
  totalNotes,
}: NotesFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes by title, content, or tag..."
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
          <Link
            href="/notes/new"
            className={cn(buttonVariants({ size: 'sm' }), 'h-9 gap-1 text-xs')}
          >
            <Plus className="h-4 w-4" />
            <span>Create Note</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Active Tags */}
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
            <span>All Notes</span>
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
            <Globe className="h-3.5 w-3.5" />
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
            onClick={() => onFilterChange('pinned')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'pinned'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Pin className="h-3.5 w-3.5" />
            <span>Pinned</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeTag && (
            <Badge variant="secondary" className="gap-1 font-normal text-xs py-0.5">
              <span>Tag: #{activeTag}</span>
              {onClearTag && (
                <button
                  type="button"
                  onClick={onClearTag}
                  className="hover:text-foreground rounded-full"
                  aria-label="Remove tag filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )}

          <span className="text-[11px] font-mono">
            {totalNotes} {totalNotes === 1 ? 'note' : 'notes'}
          </span>
        </div>
      </div>
    </div>
  );
}
