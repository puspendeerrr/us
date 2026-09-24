'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NoteVisibility } from '@/lib/notes/notes.types';
import { RichTextEditor } from './rich-text-editor';
import { TagInput } from './tag-input';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowLeft, Pin, Lock, Globe, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NewNoteForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('PRIVATE');
  const [pinned, setPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a note title');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content,
          visibility,
          pinned,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create note');
      }

      router.push(`/notes/${data.note.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error('Error creating note:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create note';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
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

        <div className="flex items-center gap-2">
          {/* Pin toggle */}
          <Button
            type="button"
            variant={pinned ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setPinned(!pinned)}
            className={cn('h-8 gap-1 text-xs', pinned && 'text-primary font-medium')}
          >
            <Pin className={`h-3.5 w-3.5 ${pinned ? 'fill-current rotate-45' : ''}`} />
            <span>{pinned ? 'Pinned' : 'Pin'}</span>
          </Button>

          {/* Visibility toggle */}
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
            >
              <Globe className="h-3 w-3" />
              <span>Shared</span>
            </button>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-8 text-xs font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              'Save Note'
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <input
          type="text"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 tracking-tight"
          maxLength={200}
          autoFocus
          required
        />
      </div>

      {/* Tags */}
      <div>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Editor */}
      <div className="pt-2">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Start typing your note here..."
        />
      </div>
    </form>
  );
}
