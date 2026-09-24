import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { Mic } from 'lucide-react';

export default async function VoicePage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Voice Memories"
          description="Private spoken notes and voice messages."
        />
        <PageContent>
          <EmptyState
            icon={Mic}
            title="No voice memories yet"
            description="Recorded voice audio and spoken memories will appear here."
          />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
