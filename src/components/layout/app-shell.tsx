'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FileText,
  MessageSquare,
  Mic,
  Mail,
  Calendar,
  CheckSquare,
  Smile,
  Clock,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AppHeader } from '@/components/layout/app-header';
import type { SessionUser } from '@/lib/auth/session';

interface AppShellProps {
  user: SessionUser;
  partner?: SessionUser | null;
  children: React.ReactNode;
}

export const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/voice', label: 'Voice Memories', icon: Mic },
  { href: '/letters', label: 'Letters', icon: Mail },
  { href: '/dates', label: 'Important Dates', icon: Calendar },
  { href: '/bucket-list', label: 'Bucket List', icon: CheckSquare },
  { href: '/mood', label: 'Mood Journal', icon: Smile },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ user, partner, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'OS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const isChat = pathname === '/chat';

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* ================= DESKTOP & TABLET SIDEBAR ================= */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-card/40 shrink-0 h-full">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-border">
          <Link
            href="/home"
            prefetch={true}
            className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <span className="text-base tracking-tight">Our Space</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium border border-border/50">
              Private
            </span>
          </Link>
        </div>

        {/* Real Partner Status Indicator */}
        {partner ? (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-muted-foreground">Partner:</span>
              <span className="font-semibold text-foreground truncate">{partner.displayName}</span>
            </div>
          </div>
        ) : (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Partner pending setup</span>
          </div>
        )}

        {/* Navigation Items (Zero Fake Badges / Zero Fake Counts) */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 text-xs font-semibold shrink-0 border border-border">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-foreground truncate">{user.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{user.identifier}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out"
            aria-label="Log out"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>

      {/* ================= MAIN COLUMN (HEADER + CONTENT) ================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AppHeader user={user} onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main
          className={cn(
            'flex-1 min-h-0',
            isChat
              ? 'flex flex-col overflow-hidden pb-14 md:pb-0'
              : 'overflow-y-auto pb-16 md:pb-6'
          )}
        >
          {children}
        </main>

        {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
        <nav
          aria-label="Mobile primary navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 h-14 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-around px-2 z-20"
        >
          <Link
            href="/home"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1 px-3',
              pathname === '/home' ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/notes"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1 px-3',
              pathname === '/notes' ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Notes</span>
          </Link>
          <Link
            href="/chat"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1 px-3',
              pathname === '/chat' ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </Link>
          <Link
            href="/settings"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1 px-3',
              pathname === '/settings' ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>

      {/* ================= MOBILE NAVIGATION DRAWER (SHEET) ================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 flex flex-col p-4">
          <SheetHeader className="text-left pb-3 border-b border-border">
            <SheetTitle className="text-base font-bold">Our Space</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {user.displayName} (@{user.identifier})
            </p>
          </SheetHeader>

          {partner && (
            <div className="my-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs">
              <span className="text-muted-foreground">Partner: </span>
              <span className="font-semibold text-foreground">{partner.displayName}</span>
            </div>
          )}

          <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full gap-2 justify-center cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
