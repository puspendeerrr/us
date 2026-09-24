import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { EmptyState } from '@/components/layout/empty-state';
import { MessageSquare } from 'lucide-react';

export default async function ChatPage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <PageContainer>
        <PageHeader
          title="Private Chat"
          description={
            partner
              ? `Direct encrypted conversation with ${partner.displayName}.`
              : 'Direct messaging between both partners.'
          }
        />
        <PageContent>
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Your private conversation history will appear here once messaging begins."
          />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}
