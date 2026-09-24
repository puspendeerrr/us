import { getAuthenticatedContext } from '@/lib/auth/context';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const { user, partner } = await getAuthenticatedContext();

  const settings = await prisma.relationshipSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      title: true,
      startAt: true,
      date: true,
      time: true,
      timezone: true,
      partnerAName: true,
      partnerBName: true,
    },
  });

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your account preferences, theme, and relationship overview."
        />
        <PageContent>
          <SettingsView user={user} partner={partner} settings={settings} />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
