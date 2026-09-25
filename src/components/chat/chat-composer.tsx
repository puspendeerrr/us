'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { RepliedMessageSummary } from '@/lib/chat/chat.types';
import { Send, X, CornerDownRight, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  replyTarget: RepliedMessageSummary | null;
  onCancelReply: () => void;
  onSendMessage: (content: string, replyToId?: string) => Promise<boolean>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  isKeyboardOpen?: boolean;
}

export function ChatComposer({
  replyTarget,
  onCancelReply,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
  isKeyboardOpen = false,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 120)}px`;
    }
  }, [text]);

  // Focus on textarea when replyTarget is set
  useEffect(() => {
    if (replyTarget && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTarget]);

  const handleInputChange = (val: string) => {
    setText(val);
    setErrorMessage(null);

    if (onStartTyping) {
      onStartTyping();
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      if (onStopTyping) {
        onStopTyping();
      }
    }, 2000);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    setErrorMessage(null);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (onStopTyping) {
      onStopTyping();
    }

    try {
      const success = await onSendMessage(trimmed, replyTarget?.id);
      if (success) {
        setText('');
        if (replyTarget) {
          onCancelReply();
        }
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px';
          // Keep focus on textarea for rapid mobile messaging
          textareaRef.current.focus();
        }
      } else {
        setErrorMessage('Failed to send message. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'border-t border-border bg-card/95 backdrop-blur-xs px-3 pt-2 transition-all duration-150 space-y-2',
        isKeyboardOpen
          ? 'pb-2 sm:pb-3'
          : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      )}
    >
      {/* Reply Preview Banner */}
      {replyTarget && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-muted/80 text-xs border-l-3 border-primary shadow-2xs animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="font-semibold text-foreground text-[11px] block truncate">
                Replying to {replyTarget.senderName}
              </span>
              <p className="truncate text-muted-foreground italic text-[11px] max-w-sm sm:max-w-md">
                &ldquo;{replyTarget.content}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Cancel reply"
            title="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-1.5 rounded-md">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled || isSending}
          maxLength={5000}
          aria-label="Type a message"
          className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1.5 focus:ring-ring focus:border-ring transition-colors disabled:opacity-50 overflow-y-auto leading-normal"
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || isSending || disabled}
          className="h-10 w-10 shrink-0 rounded-xl cursor-pointer"
          title="Send message"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
