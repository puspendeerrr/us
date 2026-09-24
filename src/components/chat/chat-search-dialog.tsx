'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChatMessageItem } from '@/lib/chat/chat.types';
import { Search, Loader2, Calendar } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMessage?: (messageId: string) => void;
}

export function ChatSearchDialog({
  open,
  onOpenChange,
  onSelectMessage,
}: ChatSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to search messages');
        }
        const data = await res.json();
        setResults(data.messages || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Search error';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base">Search Conversation</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search words in messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching messages...</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive p-2 rounded bg-destructive/10">
              {error}
            </div>
          )}

          {!isLoading && !error && query.trim() && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No messages found matching &ldquo;{query}&rdquo;.
            </p>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {results.length} Result{results.length > 1 ? 's' : ''}
              </p>
              {results.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    if (onSelectMessage) {
                      onSelectMessage(msg.id);
                    }
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-border/70 hover:bg-muted/50 transition-colors text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatDateTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
