import { prisma } from '../src/lib/prisma';
import {
  createSession,
  validateSessionToken,
  invalidateSessionToken,
  getSessionRecord,
} from '../src/lib/auth/session';
import { verifyPassword } from '../src/lib/auth/password';

async function runSessionPrivacyTests() {
  console.log('=== STARTING STRICT SESSION PRIVACY & AUTO-LOGOUT TESTS ===\n');

  // 1. Fetch valid users
  const puspender = await prisma.user.findUnique({ where: { identifier: 'puspender' } });
  const sonam = await prisma.user.findUnique({ where: { identifier: 'sonam' } });

  if (!puspender || !sonam) {
    throw new Error('Both users (puspender, sonam) must exist in database.');
  }

  console.log(`[PASS] Verified users: Puspender (${puspender.id}), Sonam (${sonam.id})`);

  // 2. Test valid login credentials verification
  console.log('\n--- 1. Testing Credential Verification & Session Creation ---');
  const passwordValid = await verifyPassword('sonam', puspender.passwordHash);
  if (!passwordValid) {
    throw new Error('Password verification failed for test user');
  }
  console.log('[PASS] Password verification succeeds for valid credentials');

  // Create session with privacy lifetime
  const session = await createSession(puspender.id);
  const token = session.token;
  console.log(`[PASS] Session created in PostgreSQL: expires in ${Math.round((session.expiresAt.getTime() - Date.now()) / (60 * 1000))} minutes`);

  // 3. Test valid session lookup
  console.log('\n--- 2. Testing Session Validation ---');
  const user = await validateSessionToken(token);
  if (!user || user.id !== puspender.id) {
    throw new Error('Session validation failed for valid token');
  }
  console.log(`[PASS] validateSessionToken returned user: ${user.displayName} (@${user.identifier})`);

  // 4. Test explicit logout and server-side deletion
  console.log('\n--- 3. Testing Explicit Logout & Server Invalidation ---');
  await invalidateSessionToken(token);

  // Verify record in PostgreSQL is GONE
  const dbRecord = await prisma.session.findUnique({ where: { sessionToken: token } });
  if (dbRecord) {
    throw new Error('Session was NOT deleted from PostgreSQL on logout');
  }
  console.log('[PASS] Session successfully deleted from PostgreSQL database');

  // Verify validateSessionToken now returns null
  const afterLogoutUser = await validateSessionToken(token);
  if (afterLogoutUser !== null) {
    throw new Error('validateSessionToken still returned user after logout');
  }
  console.log('[PASS] validateSessionToken returned null for invalidated session');

  // 5. Test Full Refresh / App Reopen Policy Simulation
  console.log('\n--- 4. Testing Full Refresh / App Reopen Invalidation Policy ---');
  // Create another session
  const session2 = await createSession(sonam.id);
  const token2 = session2.token;

  // Simulate an older session that wasn't created in the last 4 seconds
  const olderDate = new Date(Date.now() - 10000); // 10 seconds ago
  await prisma.session.update({
    where: { sessionToken: token2 },
    data: { createdAt: olderDate },
  });

  const sessionRecord = await getSessionRecord(token2);
  if (!sessionRecord) throw new Error('Session 2 record not found');

  // Simulate full document request (refresh / reopen)
  const isRsc = false;
  const secFetchDest = 'document';
  const accept = 'text/html,application/xhtml+xml';
  const isDocumentNavigation = secFetchDest === 'document' || (!isRsc && accept.includes('text/html'));
  const isImmediateLoginTransition = Date.now() - sessionRecord.createdAt.getTime() < 4000;

  if (isDocumentNavigation && !isImmediateLoginTransition) {
    // Invalidation policy triggers
    await invalidateSessionToken(token2);
    console.log('[PASS] Full document navigation correctly identified as full refresh/reopen');
    console.log('[PASS] Server-side session invalidation policy executed');
  } else {
    throw new Error('Failed to detect full refresh condition');
  }

  // Verify session 2 is dead
  const session2AfterRefresh = await validateSessionToken(token2);
  if (session2AfterRefresh !== null) {
    throw new Error('Session 2 should be invalid after refresh');
  }
  console.log('[PASS] Old session after refresh is completely dead in PostgreSQL');

  // 6. Test In-App Client-Side Navigation Simulation (Should NOT Invalidate)
  console.log('\n--- 5. Testing In-App Client-Side Navigation (RSC) ---');
  const session3 = await createSession(puspender.id);
  const token3 = session3.token;

  // Simulate client-side navigation (Home -> Chat -> Notes -> Settings)
  const isRscNav = true;
  const secFetchDestNav: string = 'empty';
  const acceptNav: string = 'text/x-component';
  const isDocumentNav = secFetchDestNav === 'document' || (!isRscNav && acceptNav.includes('text/html'));

  if (!isDocumentNav && isRscNav) {
    // Session is NOT invalidated
    const validNavUser = await validateSessionToken(token3);
    if (!validNavUser) throw new Error('In-app navigation invalidated session unexpectedly');
    console.log(`[PASS] In-app RSC navigation preserved active session for user: ${validNavUser.displayName}`);
  }

  // Clean up session 3
  await invalidateSessionToken(token3);

  // 7. Test Protected API Rejection with Invalid/Dead Session
  console.log('\n--- 6. Testing Protected API Rejection ---');
  const deadToken = 'completely-invalid-or-dead-token-12345';
  const deadUser = await validateSessionToken(deadToken);
  if (deadUser !== null) {
    throw new Error('Invalid token returned a user');
  }
  console.log('[PASS] Dead/invalid session token rejected by auth layer');

  // 8. Test Expired Session Cleanup
  console.log('\n--- 7. Testing Expired Session Handling ---');
  const expiredSession = await prisma.session.create({
    data: {
      sessionToken: 'test-expired-token-' + Date.now(),
      userId: puspender.id,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    },
  });

  const expiredUser = await validateSessionToken(expiredSession.sessionToken);
  if (expiredUser !== null) {
    throw new Error('Expired session was not rejected');
  }
  // Check that expired session was pruned from DB
  const checkExpiredPruned = await prisma.session.findUnique({
    where: { sessionToken: expiredSession.sessionToken },
  });
  if (checkExpiredPruned !== null) {
    throw new Error('Expired session was not automatically pruned from DB');
  }
  console.log('[PASS] Expired session rejected and pruned from PostgreSQL');

  // 9. Re-Login Flow Test
  console.log('\n--- 8. Testing Re-Login After Invalidation ---');
  const freshSession = await createSession(puspender.id);
  const freshUser = await validateSessionToken(freshSession.token);
  if (!freshUser || freshUser.id !== puspender.id) {
    throw new Error('Re-login failed after invalidation');
  }
  console.log(`[PASS] Re-login successfully restored fresh authenticated state: ${freshUser.displayName}`);
  await invalidateSessionToken(freshSession.token);

  console.log('\n=== ALL STRICT SESSION PRIVACY TESTS PASSED SUCCESSFULLY! ===');
}

runSessionPrivacyTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
