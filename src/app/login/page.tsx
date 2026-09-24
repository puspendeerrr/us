'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/home';

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('A connection error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">Sign In</CardTitle>
          <CardDescription>Enter your account credentials to access our space.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Username
            </label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              placeholder="Enter username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-10"
            />
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button type="submit" disabled={loading} className="w-full h-10 font-medium">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Our Space</h1>
          <p className="text-sm text-muted-foreground">Private sign-in for partners</p>
        </div>

        <React.Suspense
          fallback={
            <Card className="border-border shadow-xs p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading sign in...
            </Card>
          }
        >
          <LoginForm />
        </React.Suspense>

        <p className="text-center text-xs text-muted-foreground">
          Encrypted session · Dedicated two-person sanctuary
        </p>
      </div>
    </div>
  );
}