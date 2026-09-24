import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { NotesClient } from '@/components/notes/notes-client';

export default async function NotesPage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Notes"
          description="Shared and private thoughts for you and your partner."
        />
        <PageContent>
          <NotesClient currentUserId={user.id} />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
