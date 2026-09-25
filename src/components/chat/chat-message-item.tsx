'use client';

import { useState, useRef, useEffect } from 'react';
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
  Copy,
  CornerDownRight,
  MoreHorizontal,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ChatMessageItemProps {
  message: ChatMessageItem;
  currentUserId: string;
  onReply?: (message: ChatMessageItem) => void;
  onToggleReaction?: (messageId: string, reaction: ReactionType) => void;
  onDelete?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export function ChatMessageItemComponent({
  message,
  currentUserId,
  onReply,
  onToggleReaction,
  onDelete,
  onJumpToMessage,
}: ChatMessageItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileActionOpen, setMobileActionOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

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
    setMobileActionOpen(false);
    if (onToggleReaction) {
      onToggleReaction(message.id, reaction);
    }
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    setMobileActionOpen(false);
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleCopy = async () => {
    if (!message.content || isDeleted) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setMobileActionOpen(false);
      }, 800);
    } catch {
      // Fallback
    }
  };

  // Touch handlers for mobile WhatsApp-style long-press
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = setTimeout(() => {
      // Trigger mobile action sheet on long press
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(30);
      }
      setMobileActionOpen(true);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      // Cancel long press if user is scrolling
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDeleted) return;
    // On mobile devices or touchscreens, contextmenu acts as long-press
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      e.preventDefault();
      setMobileActionOpen(true);
    }
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group flex flex-col my-1 max-w-[88%] sm:max-w-[70%] transition-colors duration-300 rounded-2xl',
        isMine ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Main message bubble + action buttons */}
      <div className={cn('relative flex items-center gap-1.5 group/bubble max-w-full', isMine ? 'flex-row-reverse' : 'flex-row')}>
        {/* The message bubble */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative rounded-2xl px-3.5 py-2 text-sm shadow-xs transition-colors break-words overflow-hidden leading-relaxed max-w-full',
            isMine
              ? 'bg-primary text-primary-foreground rounded-br-xs'
              : 'bg-muted/80 text-foreground border border-border/40 rounded-bl-xs',
            isDeleted && 'italic opacity-60 text-muted-foreground bg-muted/40 border-dashed border-border'
          )}
        >
          {/* WhatsApp-style nested reply preview INSIDE the bubble */}
          {message.replyTo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onJumpToMessage && message.replyTo) {
                  onJumpToMessage(message.replyTo.id);
                }
              }}
              className={cn(
                'w-full text-left mb-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors flex flex-col gap-0.5 border-l-3 cursor-pointer select-none',
                isMine
                  ? 'bg-black/15 dark:bg-white/15 border-primary-foreground/80 hover:bg-black/25 dark:hover:bg-white/25 text-primary-foreground'
                  : 'bg-primary/5 dark:bg-primary/15 border-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-foreground'
              )}
              title="Jump to original message"
              aria-label={`Jump to original message from ${message.replyTo.senderName}`}
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] opacity-90 truncate">
                <CornerDownRight className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{message.replyTo.senderName}</span>
              </div>
              <div className="text-[11.5px] opacity-80 truncate line-clamp-1 italic font-normal">
                {message.replyTo.isDeleted
                  ? 'Original message unavailable'
                  : message.replyTo.content || 'Original message'}
              </div>
            </button>
          )}

          {/* Message Text Content */}
          <p className="whitespace-pre-wrap select-text">{message.content}</p>

          {/* Time and read status */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-1 text-[10px] select-none',
              isMine ? 'text-primary-foreground/75' : 'text-muted-foreground'
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

        {/* Desktop / Large Screen Hover Action Bar */}
        {!isDeleted && (
          <div
            className={cn(
              'opacity-0 group-hover/bubble:opacity-100 transition-opacity hidden sm:flex items-center gap-0.5 p-1 rounded-md bg-background/90 border border-border shadow-xs shrink-0',
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
                aria-label="Reply to message"
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

        {/* Mobile three-dot trigger for fast touch access without long-press */}
        {!isDeleted && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setMobileActionOpen(true)}
            className="sm:hidden h-7 w-7 text-muted-foreground/60 hover:text-foreground shrink-0"
            title="Message options"
            aria-label="Message options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
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

      {/* Mobile WhatsApp-style Action Bottom Sheet */}
      <Sheet open={mobileActionOpen} onOpenChange={setMobileActionOpen}>
        <SheetContent side="bottom" className="p-4 rounded-t-2xl sm:hidden">
          <SheetHeader className="text-left pb-2 border-b border-border">
            <SheetTitle className="text-sm font-semibold truncate">
              {message.senderName}
            </SheetTitle>
            <p className="text-xs text-muted-foreground truncate line-clamp-1 italic">
              {message.content}
            </p>
          </SheetHeader>

          {/* Quick Reaction Row */}
          <div className="flex items-center justify-around py-3 border-b border-border">
            {ALLOWED_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => handleReactionClick(reaction)}
                className="h-10 w-10 flex items-center justify-center text-xl hover:scale-125 transition-transform rounded-full hover:bg-muted active:scale-95"
                title={reaction}
              >
                {REACTION_TO_EMOJI[reaction]}
              </button>
            ))}
          </div>

          {/* Action List */}
          <div className="py-2 space-y-1">
            {onReply && (
              <button
                type="button"
                onClick={() => {
                  setMobileActionOpen(false);
                  onReply(message);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-left"
              >
                <Reply className="h-4 w-4 text-primary" />
                <span>Reply</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-left"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span>{copied ? 'Copied to clipboard!' : 'Copy message'}</span>
            </button>

            {isMine && onDelete && (
              <button
                type="button"
                onClick={() => {
                  setMobileActionOpen(false);
                  setDeleteOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-destructive/10 text-destructive transition-colors text-left"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete message</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
