import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SetupForm } from './setup-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ShieldCheck, HeartHandshake, LogIn } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const userCount = await prisma.user.count();

  if (userCount >= 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-sm border-border shadow-xs text-center p-6 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Setup Complete</CardTitle>
            <CardDescription>
              Our Space is restricted to exactly two accounts. Both accounts are already configured.
            </CardDescription>
          </div>
          <p className="text-xs text-muted-foreground">
            Public sign-up is permanently disabled.
          </p>
          <Link href="/login" className={buttonVariants({ className: 'w-full' })}>
            <LogIn className="mr-2 h-4 w-4" />
            Go to Sign In
          </Link>
        </Card>
      </div>
    );
  }

  const partnerNumber = (userCount === 0 ? 1 : 2) as 1 | 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-2">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Our Space</h1>
          <p className="text-sm text-muted-foreground">Initial Setup · Two-Person Private Sanctuary</p>
        </div>

        <SetupForm partnerNumber={partnerNumber} />

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>This setup flow is only active until exactly two partner accounts are registered.</p>
          {userCount === 1 && (
            <p className="font-medium text-foreground">
              Partner 1 account is registered. Register Partner 2 to lock setup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
