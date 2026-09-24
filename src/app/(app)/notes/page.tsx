import { getAuthenticatedContext } from '@/lib/auth/context';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { NotesClient } from '@/components/notes/notes-client';

export default async function NotesPage() {
  const { user } = await getAuthenticatedContext();

  return (
    <PageContainer>
      <PageHeader
        title="Notes"
        description="Shared and private thoughts for you and your partner."
      />
      <PageContent>
        <NotesClient currentUserId={user.id} />
      </PageContent>
    </PageContainer>
  );
}
