import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      {children}
    </AppShell>
  );
}
