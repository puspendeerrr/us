'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { RepliedMessageSummary } from '@/lib/chat/chat.types';
import { Send, X, CornerDownRight, AlertCircle, Loader2 } from 'lucide-react';

interface ChatComposerProps {
  replyTarget: RepliedMessageSummary | null;
  onCancelReply: () => void;
  onSendMessage: (content: string, replyToId?: string) => Promise<boolean>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

export function ChatComposer({
  replyTarget,
  onCancelReply,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Focus on replyTarget set
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
          textareaRef.current.style.height = 'auto';
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
    <div className="border-t border-border bg-background p-3 space-y-2">
      {/* Reply Banner */}
      {replyTarget && (
        <div className="flex items-center justify-between gap-2 p-1.5 px-3 rounded-md bg-muted/60 text-xs border border-border/60">
          <div className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-foreground shrink-0">
              Replying to {replyTarget.senderName}:
            </span>
            <span className="truncate italic text-muted-foreground">
              {replyTarget.content}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
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

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={disabled || isSending}
          maxLength={5000}
          className="flex-1 min-h-[40px] max-h-[140px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || isSending || disabled}
          className="h-10 w-10 shrink-0"
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
