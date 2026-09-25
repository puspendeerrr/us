import { getAuthenticatedContext } from '@/lib/auth/context';
import { listBucketItems } from '@/lib/bucket-list/bucket-list.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { BucketClient } from '@/components/bucket-list/bucket-client';

export default async function BucketListPage() {
  const { user } = await getAuthenticatedContext();
  const initialData = await listBucketItems(user.id, { status: 'all', limit: 50 });

  return (
    <PageContainer>
      <PageHeader
        title="Bucket List"
        description="Things we want to do together."
      />
      <PageContent>
        <BucketClient
          initialItems={initialData.items}
          initialProgress={initialData.progress}
          currentUserId={user.id}
        />
      </PageContent>
    </PageContainer>
  );
}
