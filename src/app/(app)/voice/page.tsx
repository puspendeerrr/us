import { getAuthenticatedContext } from '@/lib/auth/context';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { VoiceMemoriesClient } from '@/components/voice/voice-memories-client';

export const metadata = {
  title: 'Voice Memories | Our Space',
  description: 'Private spoken voice notes and audio memories.',
};

export default async function VoicePage() {
  const { user } = await getAuthenticatedContext();

  return (
    <PageContainer>
      <PageHeader
        title="Voice Memories"
        description="Spoken memories, intimate voice notes, and audio clips."
      />
      <PageContent>
        <VoiceMemoriesClient currentUserId={user.id} />
      </PageContent>
    </PageContainer>
  );
}
