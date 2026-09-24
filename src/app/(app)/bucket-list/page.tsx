import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { CheckSquare } from 'lucide-react';

export default function BucketListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Bucket List"
        description="Shared dreams, travel plans, and experiences to accomplish together."
      />
      <PageContent>
        <EmptyState
          icon={CheckSquare}
          title="Your bucket list is empty"
          description="Add adventures, places to visit, foods to try, and shared life goals."
        />
      </PageContent>
    </PageContainer>
  );
}
