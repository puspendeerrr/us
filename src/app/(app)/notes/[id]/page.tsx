import { notFound } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/context';
import { getNote } from '@/lib/notes/notes.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageContent } from '@/components/layout/page-content';
import { NoteEditorView } from '@/components/notes/note-editor-view';

interface NoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { user, partner } = await getAuthenticatedContext();
  const { id } = await params;

  const note = await getNote(user.id, id);

  if (!note) {
    notFound();
  }

  return (
    <PageContainer>
      <PageContent>
        <NoteEditorView initialNote={note} currentUserId={user.id} />
      </PageContent>
    </PageContainer>
  );
}
