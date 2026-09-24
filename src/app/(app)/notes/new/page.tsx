import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { NewNoteForm } from '@/components/notes/new-note-form';

export default function NewNotePage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Note"
        description="Create a new private or shared note."
      />
      <PageContent>
        <NewNoteForm />
      </PageContent>
    </PageContainer>
  );
}
