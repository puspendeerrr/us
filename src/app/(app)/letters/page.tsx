import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Mail } from 'lucide-react';

export default function LettersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Open When Letters"
        description="Letters sealed until specific moments or milestones occur."
      />
      <PageContent>
        <EmptyState
          icon={Mail}
          title="No letters yet"
          description="Letters written for special occasions or emotional moments will appear here."
        />
      </PageContent>
    </PageContainer>
  );
}
