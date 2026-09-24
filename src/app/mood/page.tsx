import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Smile } from 'lucide-react';

export default async function MoodPage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Mood Journal"
          description="Daily emotional check-ins and shared partner feelings."
        />
        <PageContent>
          <EmptyState
            icon={Smile}
            title="No mood entries yet"
            description="Log your daily feelings to share emotional closeness and track mood over time."
          />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
