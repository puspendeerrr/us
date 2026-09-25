import { getAuthenticatedContext } from '@/lib/auth/context';
import { listTimelineEvents } from '@/lib/timeline/timeline.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { TimelineClient } from '@/components/timeline/timeline-client';

export default async function TimelinePage() {
  const { user } = await getAuthenticatedContext();
  const initialData = await listTimelineEvents(user.id, { limit: 50, order: 'desc' });

  return (
    <PageContainer>
      <PageHeader
        title="Our Story"
        description="The chronological story and milestones of our journey together."
      />
      <PageContent>
        <TimelineClient
          initialItems={initialData.items}
          initialTotal={initialData.total}
          currentUserId={user.id}
        />
      </PageContent>
    </PageContainer>
  );
}
