'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import type { SessionUser } from '@/lib/auth/session';

interface AppHeaderProps {
  user: SessionUser;
  onOpenMobileMenu?: () => void;
}

const routeTitles: Record<string, string> = {
  '/home': 'Home',
  '/notes': 'Notes',
  '/chat': 'Chat',
  '/voice': 'Voice Memories',
  '/letters': 'Open When Letters',
  '/dates': 'Important Dates',
  '/bucket-list': 'Bucket List',
  '/mood': 'Mood Journal',
  '/timeline': 'Relationship Timeline',
  '/settings': 'Settings',
};

export function AppHeader({ user, onOpenMobileMenu }: AppHeaderProps) {
  const pathname = usePathname();
  const currentTitle = routeTitles[pathname] || 'Our Space';

  return (
    <header className="h-14 sm:h-16 border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Left: Mobile Menu Trigger + Breadcrumb / Route Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Link href="/home" className="md:hidden font-bold text-sm tracking-tight mr-1">
            Our Space
          </Link>
          <span className="hidden md:inline text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Our Space
          </span>
          <span className="hidden md:inline text-muted-foreground/40">/</span>
          <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Right: Theme Toggle & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
