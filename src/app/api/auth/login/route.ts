import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid identifier or password' },
        { status: 400 }
      );
    }

    const { identifier, password } = result.data;

    // Dual-user check: Look up user case-insensitively
    const user = await prisma.user.findUnique({
      where: { identifier: identifier.toLowerCase() },
    });

    if (!user) {
      // Mitigate timing attacks by constant-time dummy check or generic response
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session in database
    const session = await createSession(user.id);

    // Set secure HTTP-only cookie
    await setSessionCookie(session.token, session.expiresAt);

    // Update user's lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        identifier: user.identifier,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
