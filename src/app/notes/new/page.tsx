import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { NewNoteForm } from '@/components/notes/new-note-form';

export default async function NewNotePage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="New Note"
          description="Create a new private or shared note."
        />
        <PageContent>
          <NewNoteForm />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
