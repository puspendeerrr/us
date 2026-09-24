import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/home');
  }

  const userCount = await prisma.user.count();
  if (userCount < 2) {
    redirect('/setup');
  }

  redirect('/login');
}
