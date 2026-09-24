import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';

const setupSchema = z.object({
  identifier: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, hyphens, and underscores')
    .trim(),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Exactly two accounts permitted. Strictly enforce server-side.
    const userCount = await prisma.user.count();
    if (userCount >= 2) {
      return NextResponse.json(
        { error: 'Setup is locked. Our Space is restricted to exactly two partner accounts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || 'Invalid input';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { identifier, displayName, password } = result.data;
    const lowerIdentifier = identifier.toLowerCase();

    // Check if identifier is already taken
    const existing = await prisma.user.findUnique({
      where: { identifier: lowerIdentifier },
    });

    if (existing) {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const role = userCount === 0 ? 'partner_a' : 'partner_b';

    const user = await prisma.user.create({
      data: {
        identifier: lowerIdentifier,
        displayName,
        passwordHash,
        role,
      },
    });

    // If this is the second user, initialize or update relationship singleton with partner names
    if (userCount === 1) {
      const firstUser = await prisma.user.findFirst({
        where: { id: { not: user.id } },
      });

      await prisma.relationshipSettings.upsert({
        where: { id: 'singleton' },
        update: {
          partnerAName: firstUser?.displayName || null,
          partnerBName: user.displayName,
        },
        create: {
          id: 'singleton',
          title: 'Our Space',
          partnerAName: firstUser?.displayName || null,
          partnerBName: user.displayName,
        },
      });
    }

    // Immediately log in newly created user
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        identifier: user.identifier,
        displayName: user.displayName,
        role: user.role,
      },
      userCount: userCount + 1,
      isSetupComplete: userCount + 1 >= 2,
    });
  } catch (error) {
    console.error('Account setup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during account creation' },
      { status: 500 }
    );
  }
}
