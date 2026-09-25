import { prisma } from '../src/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function testHttpSessionPrivacy() {
  console.log('=== RUNNING LIVE HTTP STRICT SESSION PRIVACY TESTS ===\n');

  // 1. Login as Puspender
  console.log('--- 1. Testing Live Login ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'puspender', password: 'sonam' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('No Set-Cookie header received from login');

  const cookieMatch = setCookie.match(/our_space_session=([^;]+)/);
  if (!cookieMatch) throw new Error('our_space_session token not found in Set-Cookie');
  const token = cookieMatch[1];
  const cookieHeader = `our_space_session=${token}`;
  console.log(`[PASS] Login successful! Session token extracted.`);

  // 2. Test /api/auth/me while authenticated
  console.log('\n--- 2. Testing /api/auth/me With Valid Session ---');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  if (meRes.status !== 200) {
    throw new Error(`/api/auth/me expected 200, got ${meRes.status}`);
  }
  const meData = await meRes.json();
  console.log(`[PASS] Authenticated as ${meData.user.displayName} (@${meData.user.identifier})`);
  console.log(`[PASS] Partner resolved: ${meData.partner?.displayName}`);

  const cacheControl = meRes.headers.get('cache-control');
  if (!cacheControl || !cacheControl.includes('no-store')) {
    throw new Error('Expected Cache-Control: no-store on authenticated response');
  }
  console.log(`[PASS] Cache-Control header enforced: ${cacheControl}`);

  // 3. Test In-App Client-Side Navigation (RSC) Does NOT Invalidate Session
  console.log('\n--- 3. Testing Client-Side RSC Navigation ---');
  const rscRes = await fetch(`${BASE_URL}/home`, {
    headers: {
      Cookie: cookieHeader,
      rsc: '1',
      accept: 'text/x-component',
    },
    redirect: 'follow',
  });
  console.log(`[PASS] In-app RSC navigation to /home returned status: ${rscRes.status}, url: ${rscRes.url}`);
  if (rscRes.url.includes('/login')) {
    throw new Error(`In-app client-side navigation unexpectedly redirected to ${rscRes.url}`);
  }
  console.log('[PASS] Client-side navigation preserved active session');

  // 4. Test Full Browser Refresh / App Reopen Triggers Invalidation
  console.log('\n--- 4. Testing Full Browser Refresh Policy ---');
  // Wait > 4 seconds to ensure we are outside the immediate post-login grace window
  console.log('Waiting 4.2 seconds to simulate active user session before reload...');
  await new Promise((resolve) => setTimeout(resolve, 4200));

  const refreshRes = await fetch(`${BASE_URL}/home`, {
    headers: {
      Cookie: cookieHeader,
      'sec-fetch-dest': 'document',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'manual',
  });

  console.log(`[PASS] Full refresh document request returned status: ${refreshRes.status}`);
  const location = refreshRes.headers.get('location');
  console.log(`[PASS] Redirect destination: ${location}`);
  if (!location || !location.includes('/login')) {
    throw new Error(`Expected redirect to /login on full refresh, got ${location}`);
  }

  // 5. Verify PostgreSQL session was deleted on server
  console.log('\n--- 5. Verifying Server-Side Session Deletion in PostgreSQL ---');
  const dbSession = await prisma.session.findUnique({ where: { sessionToken: token } });
  if (dbSession !== null) {
    throw new Error('Session was NOT deleted from PostgreSQL on refresh invalidation');
  }
  console.log('[PASS] Session was verified completely destroyed in PostgreSQL');

  // 6. Verify Old Session Cannot Access Any Protected APIs
  console.log('\n--- 6. Verifying Old Session Rejected on All Protected APIs ---');
  const endpoints = [
    '/api/auth/me',
    '/api/chat/messages',
    '/api/notes',
    '/api/voice',
    '/api/letters',
    '/api/dates',
    '/api/bucket-list',
    '/api/moods',
    '/api/timeline',
    '/api/settings/relationship',
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, {
      headers: { Cookie: cookieHeader },
    });
    if (res.status !== 401) {
      throw new Error(`Endpoint ${ep} returned ${res.status} instead of 401 Unauthorized for invalidated session`);
    }
    console.log(`[PASS] ${ep} correctly returned 401 Unauthorized`);
  }

  // 7. Verify Root Page App Reopen Enforces Login
  console.log('\n--- 7. Testing Root Page App Reopen ---');
  const rootRes = await fetch(`${BASE_URL}/`, {
    headers: {
      'sec-fetch-dest': 'document',
      accept: 'text/html',
    },
    redirect: 'manual',
  });
  const rootLocation = rootRes.headers.get('location');
  if (!rootLocation || !rootLocation.includes('/login')) {
    throw new Error(`Expected root page to redirect to /login, got ${rootLocation}`);
  }
  console.log(`[PASS] Root page launch correctly redirected to: ${rootLocation}`);

  // 8. Test Re-Login After Invalidation
  console.log('\n--- 8. Testing Re-Login ---');
  const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'puspender', password: 'sonam' }),
  });
  if (!reLoginRes.ok) {
    throw new Error(`Re-login failed with status ${reLoginRes.status}`);
  }
  const reLoginCookie = reLoginRes.headers.get('set-cookie');
  const reToken = reLoginCookie?.match(/our_space_session=([^;]+)/)?.[1];
  console.log(`[PASS] Re-login succeeded with new session token`);

  // Explicit logout test
  console.log('\n--- 9. Testing Explicit Logout Endpoint ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `our_space_session=${reToken}` },
  });
  if (!logoutRes.ok) {
    throw new Error(`Logout failed with status ${logoutRes.status}`);
  }
  const checkReSession = await prisma.session.findUnique({ where: { sessionToken: reToken! } });
  if (checkReSession !== null) {
    throw new Error('Session was not deleted on explicit logout');
  }
  console.log('[PASS] Explicit logout deleted session from PostgreSQL');

  console.log('\n=== ALL LIVE HTTP STRICT SESSION PRIVACY TESTS PASSED! ===');
}

testHttpSessionPrivacy().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
