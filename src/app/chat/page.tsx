import { getAuthenticatedContext } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { ChatView } from '@/components/chat/chat-view';

export const metadata = {
  title: 'Private Chat | Our Space',
  description: 'Direct private messaging between partners.',
};

export default async function ChatPage() {
  const { user, partner } = await getAuthenticatedContext();

  return (
    <AppShell user={user} partner={partner}>
      <div className="flex-1 min-h-0 h-full flex flex-col p-2 sm:p-4 lg:p-6 overflow-hidden">
        {partner ? (
          <ChatView currentUser={user} partner={partner} />
        ) : (
          <div className="p-4 rounded-md border text-sm text-muted-foreground m-auto">
            Partner account not found. Please complete relationship setup first.
          </div>
        )}
      </div>
    </AppShell>
  );
}
