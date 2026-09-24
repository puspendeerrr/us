'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  Monitor,
  User,
  Shield,
  Palette,
  LogOut,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RelationshipSettingsEditor } from '@/components/settings/relationship-settings-editor';
import type { SessionUser } from '@/lib/auth/session';

interface SettingsViewProps {
  user: SessionUser;
  partner: SessionUser | null;
  settings: {
    title: string;
    date: string | null;
    time: string | null;
    timezone: string;
    startAt: string | Date | null;
    partnerAName: string | null;
    partnerBName: string | null;
  } | null;
}

export function SettingsView({ user, partner, settings }: SettingsViewProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Account Settings */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Account Profile</CardTitle>
          </div>
          <CardDescription>
            Your individual credentials and account information within Our Space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Display Name
              </span>
              <p className="text-base font-medium text-foreground">{user.displayName}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Username
              </span>
              <p className="text-base font-medium text-foreground">@{user.identifier}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[11px]">
              {user.role}
            </Badge>
            <span>· Authenticated with Argon2id password hash</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Relationship Settings Editor (Real Database Persistence) */}
      <RelationshipSettingsEditor initialSettings={settings} />

      {/* 3. Appearance (Strict 3-Option Theme System) */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Appearance Theme</CardTitle>
          </div>
          <CardDescription>
            Choose your preferred color theme. Stored cleanly in your local preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer text-left ${
                mounted && theme === 'light'
                  ? 'border-primary ring-2 ring-primary/20 bg-accent text-accent-foreground font-semibold'
                  : 'border-border bg-card hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Light</span>
              </div>
              {mounted && theme === 'light' && <Check className="h-4 w-4 text-primary" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer text-left ${
                mounted && theme === 'dark'
                  ? 'border-primary ring-2 ring-primary/20 bg-accent text-accent-foreground font-semibold'
                  : 'border-border bg-card hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="h-4 w-4 text-sky-400" />
                <span className="text-sm">Dark</span>
              </div>
              {mounted && theme === 'dark' && <Check className="h-4 w-4 text-primary" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer text-left ${
                mounted && theme === 'system'
                  ? 'border-primary ring-2 ring-primary/20 bg-accent text-accent-foreground font-semibold'
                  : 'border-border bg-card hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">System</span>
              </div>
              {mounted && theme === 'system' && <Check className="h-4 w-4 text-primary" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Both Light and Dark modes share the same clean productivity layout and centralized design tokens.
          </p>
        </CardContent>
      </Card>

      {/* 4. Security & Active Session */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Security & Session</CardTitle>
          </div>
          <CardDescription>
            Information about your active session and sign-out controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Session Protection
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Active & Enforced
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Encrypted HTTP-only cookies (`our_space_session`) validated server-side against PostgreSQL on every request.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Sign out of Our Space'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
