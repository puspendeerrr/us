'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessageItem,
  RepliedMessageSummary,
  ReactionType,
} from '@/lib/chat/chat.types';
import { getSocketClient, getSocketUrl } from '@/lib/chat/socket-client';
import { ChatMessageItemComponent } from './chat-message-item';
import { ChatComposer } from './chat-composer';
import { ChatSearchDialog } from './chat-search-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Search,
  MessageSquare,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { formatLastSeen } from '@/lib/chat/presence';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  currentUser: {
    id: string;
    displayName: string;
    identifier: string;
    avatarUrl: string | null;
  };
  partner: {
    id: string;
    displayName: string;
    identifier: string;
    avatarUrl: string | null;
    lastSeenAt?: Date | string | null;
  };
}

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export function ChatView({ currentUser, partner }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [, setConnectionState] = useState<ConnectionState>('connecting');

  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [replyTarget, setReplyTarget] = useState<RepliedMessageSummary | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);

  const { isKeyboardOpen } = useVisualViewport();

  // Scoped body scroll lock for chat page
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('chat-page-active');
      document.body.classList.add('chat-page-active');
      return () => {
        document.documentElement.classList.remove('chat-page-active');
        document.body.classList.remove('chat-page-active');
      };
    }
  }, []);

  // Real partner presence state
  const [partnerPresence, setPartnerPresence] = useState<{
    isOnline: boolean;
    lastSeenAt: string | Date | null;
  }>({
    isOnline: false,
    lastSeenAt: partner.lastSeenAt || null,
  });

  // Minute-level ticker to refresh relative timestamp without high-frequency renders
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPresenceTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef(true);

  // Check if scrolled near bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // When keyboard opens, keep viewport pinned to bottom if user was near bottom
  useEffect(() => {
    if (isKeyboardOpen && isNearBottomRef.current) {
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(false), 200);
    }
  }, [isKeyboardOpen, scrollToBottom]);

  // Jump to and highlight a referenced message
  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => {
        el.classList.remove('highlight-pulse');
      }, 1800);
    } else {
      setJumpNotice('Original message is further up in older history');
      setTimeout(() => setJumpNotice(null), 3000);
    }
  }, []);

  // Fetch initial messages
  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat/messages?limit=30');
      if (!res.ok) throw new Error('Failed to load chat history');
      const data = await res.json();

      setMessages(data.messages || []);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);

      // Auto mark incoming unread messages as read
      const unreadIncoming = (data.messages || [])
        .filter((m: ChatMessageItem) => !m.isMine && !m.isRead)
        .map((m: ChatMessageItem) => m.id);

      if (unreadIncoming.length > 0) {
        fetch('/api/chat/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: unreadIncoming }),
        }).catch(() => null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [scrollToBottom]);

  // Load older messages
  const loadOlderMessages = async () => {
    if (!nextCursor || isLoadingOlder) return;

    setIsLoadingOlder(true);
    const container = scrollContainerRef.current;
    const oldHeight = container ? container.scrollHeight : 0;

    try {
      const res = await fetch(`/api/chat/messages?cursor=${nextCursor}&limit=30`);
      if (!res.ok) throw new Error('Failed to load older messages');
      const data = await res.json();

      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);

      // Preserve scroll position
      setTimeout(() => {
        if (container) {
          const newHeight = container.scrollHeight;
          container.scrollTop += newHeight - oldHeight;
        }
      }, 20);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Real-time Socket.IO + Smart Vercel Sync Setup
  useEffect(() => {
    loadInitialMessages();

    // Initial partner presence query
    fetch('/api/chat/presence')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.partner) {
          setPartnerPresence({
            isOnline: Boolean(data.partner.isOnline),
            lastSeenAt: data.partner.lastSeenAt,
          });
        }
      })
      .catch(() => null);

    const socketUrl = getSocketUrl();
    const isSocketAvailable = Boolean(socketUrl);
    const socket = isSocketAvailable ? getSocketClient() : null;

    if (socket) {
      socket.connect();

      const onConnect = () => {
        setConnectionState('connected');
      };

      const onDisconnect = () => {
        setConnectionState('disconnected');
      };

      const onConnectError = () => {
        setConnectionState('disconnected');
      };

      // Partner presence events
      const onPresenceInit = (data: { userId: string; isOnline: boolean; lastSeenAt: string | null }) => {
        if (data.userId === partner.id) {
          setPartnerPresence({
            isOnline: data.isOnline,
            lastSeenAt: data.lastSeenAt,
          });
        }
      };

      const onPresenceUpdate = (data: { userId: string; isOnline: boolean; lastSeenAt: string | null }) => {
        if (data.userId === partner.id) {
          setPartnerPresence({
            isOnline: data.isOnline,
            lastSeenAt: data.lastSeenAt,
          });
        }
      };

      // Incoming new message
      const onNewMessage = (newMsg: ChatMessageItem) => {
        const item: ChatMessageItem = {
          ...newMsg,
          isMine: newMsg.senderId === currentUser.id,
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === item.id)) return prev;
          return [...prev, item];
        });

        // Clear typing indicator on message receive
        if (item.senderId === partner.id) {
          setPartnerIsTyping(false);
          // Automatically mark read if chat is open
          socket.emit('message:read', { messageIds: [item.id] });
        }

        if (isNearBottomRef.current || item.senderId === currentUser.id) {
          setTimeout(() => scrollToBottom(true), 50);
        }
      };

      // Read receipt update
      const onReadReceipt = (data: { readerId: string; messageIds?: string[]; readAt: string }) => {
        if (data.readerId === partner.id) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.isMine && (!data.messageIds || data.messageIds.includes(msg.id))) {
                return { ...msg, isRead: true, readAt: data.readAt };
              }
              return msg;
            })
          );
        }
      };

      // Reaction update
      const onReactionUpdated = (updatedMsg: ChatMessageItem) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? { ...updatedMsg, isMine: updatedMsg.senderId === currentUser.id } : m))
        );
      };

      // Deleted message update
      const onMessageDeleted = (deletedMsg: ChatMessageItem) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === deletedMsg.id ? { ...deletedMsg, isMine: deletedMsg.senderId === currentUser.id } : m))
        );
      };

      // Partner typing events
      const onTypingStart = (data: { userId: string }) => {
        if (data.userId === partner.id) {
          setPartnerIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setPartnerIsTyping(false);
          }, 3000);
        }
      };

      const onTypingStop = (data: { userId: string }) => {
        if (data.userId === partner.id) {
          setPartnerIsTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);
      socket.on('presence:init', onPresenceInit);
      socket.on('presence:update', onPresenceUpdate);
      socket.on('message:new', onNewMessage);
      socket.on('message:read_receipt', onReadReceipt);
      socket.on('message:reaction_updated', onReactionUpdated);
      socket.on('message:deleted', onMessageDeleted);
      socket.on('typing:start', onTypingStart);
      socket.on('typing:stop', onTypingStop);
    } else {
      // In standalone Vercel mode, show connected state for live sync
      setConnectionState('connected');
    }

    // Smart background sync polling (active on Vercel or when socket is offline)
    const syncLatest = async () => {
      // Refresh partner presence via REST if socket is not actively connected
      if (!socket?.connected) {
        fetch('/api/chat/presence')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.partner) {
              setPartnerPresence({
                isOnline: Boolean(data.partner.isOnline),
                lastSeenAt: data.partner.lastSeenAt,
              });
            }
          })
          .catch(() => null);
      }

      // If actively connected to WebSocket, let socket push events
      if (socket?.connected) return;
      // Pause polling if tab is backgrounded
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const res = await fetch('/api/chat/messages?limit=30');
        if (!res.ok) return;
        const data = await res.json();
        const incoming: ChatMessageItem[] = data.messages || [];

        setMessages((prev) => {
          if (prev.length === 0) return incoming;

          const prevMap = new Map(prev.map((m) => [m.id, m]));
          let hasChanges = false;
          const merged = [...prev];

          for (const inc of incoming) {
            const existing = prevMap.get(inc.id);
            if (!existing) {
              merged.push(inc);
              hasChanges = true;
            } else if (
              existing.content !== inc.content ||
              existing.isDeleted !== inc.isDeleted ||
              existing.isRead !== inc.isRead ||
              JSON.stringify(existing.reactions) !== JSON.stringify(inc.reactions)
            ) {
              const idx = merged.findIndex((m) => m.id === inc.id);
              if (idx !== -1) {
                merged[idx] = inc;
                hasChanges = true;
              }
            }
          }

          if (hasChanges && isNearBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 50);
          }

          return hasChanges ? merged : prev;
        });

        // Mark incoming unread messages as read
        const unreadIncoming = incoming
          .filter((m) => !m.isMine && !m.isRead)
          .map((m) => m.id);

        if (unreadIncoming.length > 0) {
          fetch('/api/chat/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: unreadIncoming }),
          }).catch(() => null);
        }
      } catch {
        // Silently catch background poll network errors
      }
    };

    // Auto-sync every 3 seconds for near-instant message delivery on Vercel
    const pollInterval = setInterval(syncLatest, 3000);

    // Sync immediately when tab regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLatest();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('presence:init');
        socket.off('presence:update');
        socket.off('message:new');
        socket.off('message:read_receipt');
        socket.off('message:reaction_updated');
        socket.off('message:deleted');
        socket.off('typing:start');
        socket.off('typing:stop');
      }
    };
  }, [currentUser.id, partner.id, loadInitialMessages, scrollToBottom]);

  // Send message handler (Socket.IO with REST fallback)
  const handleSendMessage = async (content: string, replyToId?: string): Promise<boolean> => {
    const socket = getSocketUrl() ? getSocketClient() : null;

    // Try Socket.IO if connected
    if (socket && socket.connected) {
      return new Promise<boolean>((resolve) => {
        socket.emit('message:send', { content, replyToId }, (res: any) => {
          if (res && res.success) {
            resolve(true);
          } else {
            // Fallback to REST if socket emit errored
            fallbackRestSend(content, replyToId).then(resolve);
          }
        });
      });
    }

    // Direct REST fallback
    return fallbackRestSend(content, replyToId);
  };

  const fallbackRestSend = async (content: string, replyToId?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, replyToId }),
      });
      if (!res.ok) throw new Error('REST send failed');
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => scrollToBottom(true), 50);
      return true;
    } catch {
      return false;
    }
  };

  // Toggle reaction handler (Socket.IO + REST fallback)
  const handleToggleReaction = async (messageId: string, reaction: ReactionType) => {
    const socket = getSocketUrl() ? getSocketClient() : null;
    if (socket && socket.connected) {
      socket.emit('message:react', { messageId, reaction });
      return;
    }

    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      }
    } catch (err) {
      console.error('Reaction toggle failed:', err);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    const socket = getSocketUrl() ? getSocketClient() : null;
    if (socket && socket.connected) {
      socket.emit('message:delete', { messageId });
      return;
    }

    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Typing event emitters
  const handleStartTyping = () => {
    const socket = getSocketUrl() ? getSocketClient() : null;
    if (socket && socket.connected) {
      socket.emit('typing:start');
    }
  };

  const handleStopTyping = () => {
    const socket = getSocketUrl() ? getSocketClient() : null;
    if (socket && socket.connected) {
      socket.emit('typing:stop');
    }
  };

  // Reply trigger
  const handleReplyToMessage = (msg: ChatMessageItem) => {
    setReplyTarget({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.isDeleted ? 'This message was deleted' : msg.content.slice(0, 150),
      isDeleted: msg.isDeleted,
    });
  };

  return (
    <div className="relative flex flex-col min-h-0 flex-1 w-full max-w-5xl mx-auto rounded-none sm:rounded-xl border-x-0 sm:border border-y-0 sm:border-y border-border bg-card shadow-xs overflow-hidden h-full chat-viewport-height">
      {/* Toast Notice for jump action */}
      {jumpNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-foreground/90 text-background text-xs shadow-md animate-in fade-in slide-in-from-top-2 pointer-events-none">
          {jumpNotice}
        </div>
      )}

      {/* Chat Header */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border bg-card/80 backdrop-blur-xs z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
            <AvatarImage src={partner.avatarUrl || ''} alt={partner.displayName} />
            <AvatarFallback className="text-xs font-semibold">
              {partner.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-tight">
              {partner.displayName}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
              {partnerPresence.isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Online</span>
                </>
              ) : (
                <span>{formatLastSeen(partnerPresence.lastSeenAt)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Search messages"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-2 select-text chat-messages flex flex-col overscroll-contain"
      >
        {/* Load older messages button */}
        {hasMore && (
          <div className="shrink-0 flex justify-center pb-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={loadOlderMessages}
              disabled={isLoadingOlder}
              className="gap-1 text-[11px] h-7"
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading older...</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Load older messages</span>
                </>
              )}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center m-auto text-xs text-muted-foreground py-16 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center m-auto text-center py-8 text-muted-foreground space-y-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet.</p>
            <p className="text-xs max-w-xs">
              Send your first message below to start your private conversation with {partner.displayName}.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItemComponent
              key={msg.id}
              message={msg}
              currentUserId={currentUser.id}
              onReply={handleReplyToMessage}
              onToggleReaction={handleToggleReaction}
              onDelete={handleDeleteMessage}
              onJumpToMessage={handleJumpToMessage}
            />
          ))
        )}
      </div>

      {/* Partner Typing Indicator Banner */}
      {partnerIsTyping && (
        <div className="shrink-0 px-4 py-1 text-xs text-muted-foreground bg-muted/20 border-t border-border/40 flex items-center gap-1.5 animate-in fade-in">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
          </span>
          <span>{partner.displayName} is typing...</span>
        </div>
      )}

      {/* Message Composer */}
      <div className="shrink-0">
        <ChatComposer
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onSendMessage={handleSendMessage}
          onStartTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          isKeyboardOpen={isKeyboardOpen}
        />
      </div>

      {/* Search Dialog */}
      <ChatSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectMessage={(msgId) => {
          handleJumpToMessage(msgId);
        }}
      />
    </div>
  );
}
