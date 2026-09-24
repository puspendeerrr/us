'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { NoteRevisionItem } from '@/lib/notes/notes.types';
import { Badge } from '@/components/ui/badge';
import { History, Eye, Calendar, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface RevisionsDrawerProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevisionsDrawer({
  noteId,
  open,
  onOpenChange,
}: RevisionsDrawerProps) {
  const [revisions, setRevisions] = useState<NoteRevisionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<NoteRevisionItem | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedRevision(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/notes/${noteId}/revisions`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load revisions');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setRevisions(data.revisions || []);
          if (data.revisions && data.revisions.length > 0) {
            setSelectedRevision(data.revisions[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [noteId, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full overflow-hidden p-0">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-base font-semibold">Revision History</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Inspect previous saved snapshots of this note. Revisions are private and view-only.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {error && (
            <div className="p-3 text-xs rounded border border-destructive/30 bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && revisions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No revisions recorded yet.
            </p>
          )}

          {!loading && revisions.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Past Versions ({revisions.length})
                </p>
                <div className="space-y-1">
                  {revisions.map((rev, index) => {
                    const isSelected = selectedRevision?.id === rev.id;
                    const date = new Date(rev.createdAt);
                    const formattedDate = date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = date.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <button
                        key={rev.id}
                        type="button"
                        onClick={() => setSelectedRevision(rev)}
                        className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {rev.title || 'Untitled'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {index === 0 ? 'Latest Revision' : `v${revisions.length - index}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formattedDate} at {formattedTime}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {rev.author.displayName}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedRevision && (
                <div className="border border-border rounded-md p-3.5 bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Snapshot Preview
                    </span>
                    <Badge variant={selectedRevision.visibility === 'PRIVATE' ? 'outline' : 'secondary'} className="text-[10px]">
                      {selectedRevision.visibility}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-foreground">
                      {selectedRevision.title || 'Untitled'}
                    </h4>
                  </div>
                  <div
                    className="prose dark:prose-invert max-w-none text-xs leading-relaxed border rounded p-2.5 bg-background max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: selectedRevision.content || '<p class="text-muted-foreground italic">No content</p>',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
