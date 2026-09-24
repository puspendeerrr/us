'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

interface SetupFormProps {
  partnerNumber: 1 | 2;
}

export function SetupForm({ partnerNumber }: SetupFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState('');
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || !identifier.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account.');
        setLoading(false);
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      console.error('Setup error:', err);
      setError('A connection error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {partnerNumber}
            </span>
            <CardTitle className="text-lg">
              Create Partner {partnerNumber} Account
            </CardTitle>
          </div>
          <CardDescription>
            {partnerNumber === 1
              ? 'Set up your primary account for Our Space.'
              : 'Set up your partner’s account to complete the pair.'}
          </CardDescription>
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
              htmlFor="displayName"
              className="text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Your Real Name
            </label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              className="h-10"
            />
          </div>

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
              autoComplete="new-password"
              required
              placeholder="Minimum 6 characters"
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
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account & Access Space
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
