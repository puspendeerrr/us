import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, invalidateCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // Strict privacy policy: Opening the app from the root URL / Home Screen shortcut
  // invalidates any prior background session and always prompts for login.
  if (token) {
    await invalidateCurrentSession();
  }

  const userCount = await prisma.user.count();
  if (userCount < 2) {
    redirect('/setup');
  }

  redirect('/login');
}
