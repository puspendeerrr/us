import { getAuthenticatedContext } from '@/lib/auth/context';
import { listLetters } from '@/lib/letters/letters.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { LettersClient } from '@/components/letters/letters-client';

export default async function LettersPage() {
  const { user, partner } = await getAuthenticatedContext();
  const initialData = await listLetters(user.id, { tab: 'all', limit: 20 });

  return (
    <PageContainer>
      <PageHeader
        title="Open When Letters"
        description="Private sealed letters for your relationship that remain locked until their scheduled moment."
      />
      <PageContent>
        <LettersClient
          initialItems={initialData.items}
          initialTotal={initialData.total}
          initialHasMore={initialData.hasMore}
          initialNextCursor={initialData.nextCursor}
          currentUserId={user.id}
          partnerName={partner?.displayName || 'Partner'}
          partnerId={partner?.id || ''}
        />
      </PageContent>
    </PageContainer>
  );
}
