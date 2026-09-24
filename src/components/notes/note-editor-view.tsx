'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NoteDetail, NoteVisibility } from '@/lib/notes/notes.types';
import { RichTextEditor } from './rich-text-editor';
import { TagInput } from './tag-input';
import { RevisionsDrawer } from './revisions-drawer';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Pin,
  Lock,
  Globe,
  Trash2,
  History,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

interface NoteEditorViewProps {
  initialNote: NoteDetail;
  currentUserId: string;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function NoteEditorView({
  initialNote,
  currentUserId,
}: NoteEditorViewProps) {
  const router = useRouter();
  const isOwner = initialNote.ownerId === currentUserId;

  // Form state
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [visibility, setVisibility] = useState<NoteVisibility>(initialNote.visibility);
  const [pinned, setPinned] = useState(initialNote.pinned);
  const [tags, setTags] = useState<string[]>(initialNote.tags.map((t) => t.name));

  // Baseline state to compare against for autosave
  const baselineRef = useRef({
    title: initialNote.title,
    content: initialNote.content,
    visibility: initialNote.visibility,
    pinned: initialNote.pinned,
    tags: initialNote.tags.map((t) => t.name),
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string>(initialNote.updatedAt);
  const [revisionCount, setRevisionCount] = useState(initialNote.revisionCount);

  // Modals
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  // Save function
  const saveChanges = useCallback(async () => {
    if (!isOwner) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    const payload = {
      title: title.trim() || 'Untitled Note',
      content,
      visibility,
      pinned,
      tags,
    };

    try {
      const res = await fetch(`/api/notes/${initialNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note');
      }

      // Update baseline to match current payload
      baselineRef.current = {
        title: data.note.title,
        content: data.note.content,
        visibility: data.note.visibility,
        pinned: data.note.pinned,
        tags: data.note.tags.map((t: { name: string }) => t.name),
      };

      setLastSavedAt(data.note.updatedAt);
      setRevisionCount(data.note.revisionCount);
      setSaveStatus('saved');
    } catch (err: unknown) {
      console.error('Autosave failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Save failed';
      setErrorMessage(errorMsg);
      setSaveStatus('error');
    }
  }, [initialNote.id, isOwner, title, content, visibility, pinned, tags]);

  // Autosave debounce effect
  useEffect(() => {
    if (!isOwner) return;

    const base = baselineRef.current;
    const hasTagsChanged =
      tags.length !== base.tags.length ||
      tags.some((t, i) => t !== base.tags[i]);

    const isDirty =
      title !== base.title ||
      content !== base.content ||
      visibility !== base.visibility ||
      pinned !== base.pinned ||
      hasTagsChanged;

    if (!isDirty) {
      if (saveStatus !== 'saving' && saveStatus !== 'error') {
        setSaveStatus('saved');
      }
      return;
    }

    setSaveStatus('unsaved');

    const timer = setTimeout(() => {
      saveChanges();
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, visibility, pinned, tags, isOwner, saveChanges, saveStatus]);

  // Handle immediate pin toggle
  const togglePin = async () => {
    if (!isOwner) return;
    const nextPinned = !pinned;
    setPinned(nextPinned);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!isOwner) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/notes/${initialNote.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete note');
      }
      router.push('/notes');
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete note';
      alert(errorMsg);
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Link
            href="/notes"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Notes</span>
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-border">|</span>
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              {saveStatus === 'error' && (
                <div className="inline-flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errorMessage || 'Save failed'}</span>
                  <button
                    type="button"
                    onClick={saveChanges}
                    className="ml-1 underline font-medium hover:opacity-80 inline-flex items-center gap-0.5"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              {/* Pin toggle */}
              <Button
                type="button"
                variant={pinned ? 'secondary' : 'outline'}
                size="sm"
                onClick={togglePin}
                className={cn('h-8 gap-1 text-xs', pinned && 'text-primary font-medium')}
                title={pinned ? 'Pinned to top' : 'Pin to top'}
              >
                <Pin className={`h-3.5 w-3.5 ${pinned ? 'fill-current rotate-45' : ''}`} />
                <span>{pinned ? 'Pinned' : 'Pin'}</span>
              </Button>

              {/* Visibility Switcher */}
              <div className="flex items-center rounded-md border border-input p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors',
                    visibility === 'PRIVATE'
                      ? 'bg-background font-medium text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Only you can see this note"
                >
                  <Lock className="h-3 w-3" />
                  <span>Private</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('SHARED')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors',
                    visibility === 'SHARED'
                      ? 'bg-background font-medium text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Visible to both you and your partner"
                >
                  <Globe className="h-3 w-3" />
                  <span>Shared</span>
                </button>
              </div>

              {/* Revisions trigger */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevisionsOpen(true)}
                className="h-8 gap-1.5 text-xs"
                title="View revision history"
              >
                <History className="h-3.5 w-3.5" />
                <span>History ({revisionCount})</span>
              </Button>

              {/* Delete trigger */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Globe className="h-3 w-3" />
                <span>Shared Note</span>
              </Badge>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Author: {initialNote.owner.displayName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Partner Notice if read-only */}
      {!isOwner && (
        <div className="bg-muted/40 border border-border/80 rounded-md p-3 text-xs text-muted-foreground flex items-center justify-between">
          <p>
            This note was written by <strong>{initialNote.owner.displayName}</strong> and shared with you.
            Only the author can modify or delete it.
          </p>
          <span className="text-[11px] font-mono shrink-0 ml-2">
            Last updated: {formatDateTime(initialNote.updatedAt)}
          </span>
        </div>
      )}

      {/* Title & Metadata input */}
      <div className="space-y-3">
        {isOwner ? (
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 tracking-tight"
            maxLength={200}
          />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialNote.title || 'Untitled Note'}
          </h1>
        )}

        {/* Tags management */}
        <div className="pt-1">
          <TagInput
            tags={tags}
            onChange={setTags}
            disabled={!isOwner}
          />
        </div>
      </div>

      {/* Rich Text Editor */}
      <div className="pt-2">
        <RichTextEditor
          content={content}
          onChange={isOwner ? setContent : undefined}
          editable={isOwner}
          placeholder="Start typing your note..."
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-border/40 font-mono">
        <span>
          Created {formatDateTime(initialNote.createdAt)}
        </span>
        <span>
          Last saved {formatDateTime(lastSavedAt)}
        </span>
      </div>

      {/* Revisions Drawer */}
      {isOwner && (
        <RevisionsDrawer
          noteId={initialNote.id}
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{title || 'this note'}&rdquo;?
              This action permanently removes the note and its revision history from PostgreSQL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
