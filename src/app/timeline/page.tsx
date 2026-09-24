import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Clock } from 'lucide-react';

export default async function TimelinePage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Relationship Timeline"
          description="The chronological story and milestones of our journey together."
        />
        <PageContent>
          <EmptyState
            icon={Clock}
            title="No memories added yet"
            description="Your story will unfold here chronologically as you record milestones, trips, and memories."
          />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
