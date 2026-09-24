import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Calendar } from 'lucide-react';

export default async function DatesPage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Important Dates"
          description="Anniversaries, birthdays, and relationship countdowns."
        />
        <PageContent>
          <EmptyState
            icon={Calendar}
            title="No important dates yet"
            description="Your tracked dates, celebrations, and countdowns will appear here once saved."
          />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
