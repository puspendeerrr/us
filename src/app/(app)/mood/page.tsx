import { getAuthenticatedContext } from '@/lib/auth/context';
import { listMoodEntries } from '@/lib/moods/mood.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { MoodClient } from '@/components/mood/mood-client';

export default async function MoodPage() {
  const { user } = await getAuthenticatedContext();
  const initialData = await listMoodEntries(user.id, { limit: 50 });

  return (
    <PageContainer>
      <PageHeader
        title="Mood Journal"
        description="Daily emotional check-ins and shared partner feelings."
      />
      <PageContent>
        <MoodClient
          initialItems={initialData.items}
          initialTotal={initialData.total}
          currentUserId={user.id}
        />
      </PageContent>
    </PageContainer>
  );
}
