import { getAuthenticatedContext } from '@/lib/auth/context';
import { listImportantDates } from '@/lib/dates/dates.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { DatesClient } from '@/components/dates/dates-client';

export default async function DatesPage() {
  const { user } = await getAuthenticatedContext();
  const initialData = await listImportantDates(user.id, { tab: 'all', limit: 50 });

  return (
    <PageContainer>
      <PageHeader
        title="Important Dates"
        description="Relationship milestones, anniversaries, birthdays, and upcoming countdowns."
      />
      <PageContent>
        <DatesClient
          initialItems={initialData.items}
          initialTotal={initialData.total}
          currentUserId={user.id}
        />
      </PageContent>
    </PageContainer>
  );
}
