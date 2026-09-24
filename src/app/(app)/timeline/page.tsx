import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Clock } from 'lucide-react';

export default function TimelinePage() {
  return (
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
  );
}
