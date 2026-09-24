'use client';

import Link from 'next/link';
import { NoteListItem } from '@/lib/notes/notes.types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin, Lock, Globe, Clock, User as UserIcon } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface NoteCardProps {
  note: NoteListItem;
  currentUserId: string;
  onTogglePin?: (noteId: string, pinned: boolean) => void;
}

export function NoteCard({
  note,
  currentUserId,
  onTogglePin,
}: NoteCardProps) {
  const isOwner = note.ownerId === currentUserId;
  const isPrivate = note.visibility === 'PRIVATE';

  const updatedTimeText = formatRelativeTime(note.updatedAt);

  return (
    <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors group relative overflow-hidden h-full">
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/notes/${note.id}`}
            className="flex-1 font-semibold text-base leading-snug line-clamp-2 hover:underline focus:outline-none"
          >
            {note.title || 'Untitled Note'}
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {note.pinned && (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px] gap-1 font-normal bg-primary/10 text-primary border-primary/20">
                <Pin className="h-3 w-3 fill-current rotate-45" />
                <span>Pinned</span>
              </Badge>
            )}

            {isOwner && onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin(note.id, !note.pinned);
                }}
                className={`p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
                  note.pinned ? 'text-primary' : 'opacity-0 group-hover:opacity-100'
                }`}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={`h-3.5 w-3.5 ${note.pinned ? 'fill-current rotate-45' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant={isPrivate ? 'outline' : 'secondary'}
            className="text-[10px] px-1.5 py-0 inline-flex items-center gap-1 font-normal"
          >
            {isPrivate ? (
              <>
                <Lock className="h-2.5 w-2.5" />
                <span>Private</span>
              </>
            ) : (
              <>
                <Globe className="h-2.5 w-2.5" />
                <span>Shared</span>
              </>
            )}
          </Badge>

          <span className="text-[11px] flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {isOwner ? 'You' : note.owner.displayName}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex-1">
        <Link href={`/notes/${note.id}`} className="block">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {note.snippet || 'No content...'}
          </p>
        </Link>
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground bg-muted/20">
        <div className="flex flex-wrap gap-1 items-center max-w-[70%]">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground"
            >
              #{tag.name}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Clock className="h-3 w-3" />
          <span>{updatedTimeText}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
