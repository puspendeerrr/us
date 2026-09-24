'use client';

import { useState } from 'react';
import {
  ChatMessageItem,
  ReactionType,
  ALLOWED_REACTIONS,
  REACTION_TO_EMOJI,
} from '@/lib/chat/chat.types';
import {
  Check,
  CheckCheck,
  Reply,
  Trash2,
  Smile,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ChatMessageItemProps {
  message: ChatMessageItem;
  currentUserId: string;
  onReply?: (message: ChatMessageItem) => void;
  onToggleReaction?: (messageId: string, reaction: ReactionType) => void;
  onDelete?: (messageId: string) => void;
}

export function ChatMessageItemComponent({
  message,
  currentUserId,
  onReply,
  onToggleReaction,
  onDelete,
}: ChatMessageItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isMine = message.senderId === currentUserId;
  const isDeleted = message.isDeleted;

  // Format message time
  let timeStr = '';
  try {
    const d = new Date(message.createdAt);
    timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    timeStr = '';
  }

  const handleReactionClick = (reaction: ReactionType) => {
    setShowEmojiPicker(false);
    if (onToggleReaction) {
      onToggleReaction(message.id, reaction);
    }
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    if (onDelete) {
      onDelete(message.id);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col my-1 max-w-[85%] sm:max-w-[70%]',
        isMine ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Replied reference quote if present */}
      {message.replyTo && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground mb-1 px-2 py-1 rounded bg-muted/40 border-l-2 border-primary/60 max-w-full truncate',
            isMine ? 'mr-1' : 'ml-1'
          )}
        >
          <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/70" />
          <span className="font-medium text-foreground/80 shrink-0">
            {message.replyTo.senderName}:
          </span>
          <span className="truncate italic">
            {message.replyTo.content}
          </span>
        </div>
      )}

      {/* Main message bubble + action buttons */}
      <div className={cn('relative flex items-center gap-1.5 group/bubble', isMine ? 'flex-row-reverse' : 'flex-row')}>
        {/* The message bubble */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm shadow-xs transition-colors break-words overflow-hidden leading-relaxed',
            isMine
              ? 'bg-primary text-primary-foreground rounded-br-xs'
              : 'bg-muted/80 text-foreground border border-border/40 rounded-bl-xs',
            isDeleted && 'italic opacity-60 text-muted-foreground bg-muted/40 border-dashed border-border'
          )}
        >
          <p className="whitespace-pre-wrap select-text">{message.content}</p>

          {/* Time and read status */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-1 text-[10px] select-none',
              isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            <span>{timeStr}</span>
            {isMine && !isDeleted && (
              <span
                className="inline-flex items-center ml-0.5"
                title={message.isRead ? 'Read' : 'Sent'}
                aria-label={message.isRead ? 'Read' : 'Sent'}
              >
                {message.isRead ? (
                  <CheckCheck className="h-3 w-3 text-emerald-400 dark:text-emerald-300" />
                ) : (
                  <Check className="h-3 w-3 opacity-80" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Hover / tap actions (Reply, Reaction, Delete) */}
        {!isDeleted && (
          <div
            className={cn(
              'opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 p-1 rounded-md bg-background/90 border border-border shadow-xs shrink-0',
              isMine ? 'mr-1' : 'ml-1'
            )}
          >
            {/* Reaction button */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="React"
                aria-label="React"
              >
                <Smile className="h-3.5 w-3.5" />
              </Button>

              {/* Emoji quick bar */}
              {showEmojiPicker && (
                <div
                  className={cn(
                    'absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-popover text-popover-foreground border border-border rounded-full shadow-md animate-in fade-in zoom-in-95',
                    isMine ? 'right-0' : 'left-0'
                  )}
                >
                  {ALLOWED_REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      type="button"
                      onClick={() => handleReactionClick(reaction)}
                      className="h-7 w-7 flex items-center justify-center text-sm hover:scale-125 transition-transform rounded-full hover:bg-muted"
                      title={reaction}
                    >
                      {REACTION_TO_EMOJI[reaction]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply button */}
            {onReply && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onReply(message)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Reply"
                aria-label="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Delete button (author only) */}
            {isMine && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setDeleteOpen(true)}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                title="Delete message"
                aria-label="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Rendered reactions below bubble */}
      {message.reactions.length > 0 && !isDeleted && (
        <div className={cn('flex flex-wrap gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
          {message.reactions.map((r) => (
            <button
              key={r.reaction}
              type="button"
              onClick={() => onToggleReaction && onToggleReaction(message.id, r.reaction)}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
                r.reactedByMe
                  ? 'bg-primary/10 border-primary/30 text-foreground font-medium'
                  : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
              )}
              title={`${r.count} reaction${r.count > 1 ? 's' : ''}`}
            >
              <span>{r.emoji}</span>
              <span className="text-[11px]">{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Delete message?</DialogTitle>
            <DialogDescription className="text-xs">
              This will remove message content for both you and your partner. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
