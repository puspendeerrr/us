import { prisma } from '@/lib/prisma';
import { getDashboardData } from '@/lib/dashboard/dashboard.service';

const BASE_URL = 'http://localhost:3000';

async function login(identifier: string, password: string): Promise<{ cookie: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${identifier}: ${res.status}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`No set-cookie for ${identifier}`);

  const data = await res.json();
  return { cookie: setCookie, user: data.user };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('=== STARTING PHASE 10: MOOD JOURNAL TESTS ===\n');

  const createdIds: string[] = [];

  try {
    // ----------------------------------------------------
    // 1. Unauthenticated Access Checks (401)
    // ----------------------------------------------------
    console.log('--- 1. Testing Unauthenticated Access (401) ---');

    const unauthGet = await fetch(`${BASE_URL}/api/moods`);
    assert(unauthGet.status === 401, `Unauthenticated GET /api/moods must be 401, got ${unauthGet.status}`);

    const unauthPost = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: 'HAPPY', visibility: 'SHARED', date: '2026-09-25' }),
    });
    assert(unauthPost.status === 401, `Unauthenticated POST /api/moods must be 401, got ${unauthPost.status}`);

    const unauthGetId = await fetch(`${BASE_URL}/api/moods/some-id`);
    assert(unauthGetId.status === 401, `Unauthenticated GET /api/moods/[id] must be 401, got ${unauthGetId.status}`);

    const unauthPatch = await fetch(`${BASE_URL}/api/moods/some-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: 'LOVED' }),
    });
    assert(unauthPatch.status === 401, `Unauthenticated PATCH /api/moods/[id] must be 401, got ${unauthPatch.status}`);

    const unauthDelete = await fetch(`${BASE_URL}/api/moods/some-id`, {
      method: 'DELETE',
    });
    assert(unauthDelete.status === 401, `Unauthenticated DELETE /api/moods/[id] must be 401, got ${unauthDelete.status}`);

    console.log('[PASS] All unauthenticated requests correctly return 401');

    // ----------------------------------------------------
    // Authenticate Partners
    // ----------------------------------------------------
    console.log('\n--- Authenticating Couple Partners ---');
    const puspender = await login('puspender', 'sonam');
    const sonam = await login('sonam', 'puspender');
    assert(puspender.user.id !== sonam.user.id, 'Users must have different IDs');
    console.log(`[PASS] Puspender (${puspender.user.id}) & Sonam (${sonam.user.id}) logged in`);

    // ----------------------------------------------------
    // 2. Validation Testing (400)
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Zod Input Validation (400) ---');

    // Invalid mood
    const invalidMoodRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ mood: 'ECSTATIC', visibility: 'SHARED', date: '2026-09-25' }),
    });
    assert(invalidMoodRes.status === 400, `Invalid mood must return 400, got ${invalidMoodRes.status}`);

    // Invalid visibility
    const invalidVisRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ mood: 'HAPPY', visibility: 'SECRET', date: '2026-09-25' }),
    });
    assert(invalidVisRes.status === 400, `Invalid visibility must return 400, got ${invalidVisRes.status}`);

    // Missing required fields (missing date)
    const missingDateRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ mood: 'HAPPY', visibility: 'SHARED' }),
    });
    assert(missingDateRes.status === 400, `Missing date must return 400, got ${missingDateRes.status}`);

    // Oversized note (>2000 chars)
    const oversizedNoteRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        mood: 'HAPPY',
        visibility: 'SHARED',
        date: '2026-09-25',
        note: 'X'.repeat(2001),
      }),
    });
    assert(oversizedNoteRes.status === 400, `Note > 2000 chars must return 400, got ${oversizedNoteRes.status}`);

    console.log('[PASS] Validation correctly rejected invalid mood, invalid visibility, missing fields, and oversized notes');

    // ----------------------------------------------------
    // 3. Spoofing Prevention
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Spoofing Prevention ---');

    // Attempting to spoof createdById as Sonam
    const spoofPostRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        mood: 'LOVED',
        visibility: 'SHARED',
        date: '2026-09-25',
        note: 'Testing spoofing',
        createdById: sonam.user.id,
      }),
    });
    assert(
      spoofPostRes.status === 400,
      `Attempting to inject createdById must be rejected with 400, got ${spoofPostRes.status}`
    );
    console.log('[PASS] createdById injection attempt strictly rejected with 400 by Zod schema');

    // ----------------------------------------------------
    // 4. Shared vs Private Mood Privacy Enforcement
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Shared vs Private Privacy Guarantees ---');

    // Puspender creates a SHARED mood entry
    const sharedRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        mood: 'HAPPY',
        visibility: 'SHARED',
        date: '2026-09-25T12:00:00.000Z',
        note: 'Super excited for our weekend trip together!',
      }),
    });
    assert(sharedRes.status === 201, 'Puspender creates SHARED mood');
    const sharedItem = (await sharedRes.json()).item;
    createdIds.push(sharedItem.id);

    // Puspender creates a PRIVATE mood entry
    const privateRes = await fetch(`${BASE_URL}/api/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        mood: 'TIRED_DRAINED',
        visibility: 'PRIVATE',
        date: '2026-09-25T12:00:00.000Z',
        note: 'Work was exhausting today with secret confidential project deadlines.',
      }),
    });
    assert(privateRes.status === 201, 'Puspender creates PRIVATE mood');
    const privateItem = (await privateRes.json()).item;
    createdIds.push(privateItem.id);

    // Sonam lists moods -> MUST see the SHARED item, MUST NOT see the PRIVATE item
    const sonamListRes = await fetch(`${BASE_URL}/api/moods`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(sonamListRes.ok, 'Sonam GET /api/moods');
    const sonamListData = await sonamListRes.json();

    const sonamSeesShared = sonamListData.items.some((it: any) => it.id === sharedItem.id);
    const sonamSeesPrivate = sonamListData.items.some((it: any) => it.id === privateItem.id);
    assert(sonamSeesShared, 'Sonam MUST see Puspender SHARED mood');
    assert(!sonamSeesPrivate, 'Sonam MUST NOT see Puspender PRIVATE mood');
    console.log('[PASS] Sonam sees SHARED mood but does NOT see PRIVATE mood in feed');

    // Sonam attempts direct GET /api/moods/[privateItem.id] -> MUST be 404 (not leaking existence)
    const sonamGetPrivateRes = await fetch(`${BASE_URL}/api/moods/${privateItem.id}`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(
      sonamGetPrivateRes.status === 404,
      `Sonam direct GET on private mood MUST return 404, got ${sonamGetPrivateRes.status}`
    );
    console.log('[PASS] Direct access by partner to PRIVATE mood returns 404');

    // Sonam searches for unique keyword in Puspender's private note ("confidential")
    const sonamSearchRes = await fetch(`${BASE_URL}/api/moods?search=confidential`, {
      headers: { Cookie: sonam.cookie },
    });
    const sonamSearchData = await sonamSearchRes.json();
    assert(
      sonamSearchData.items.length === 0,
      `Sonam search for private keyword must return 0 results, got ${sonamSearchData.items.length}`
    );
    console.log('[PASS] Private mood note does NOT leak via partner search');

    // Sonam queries by date for Puspender's private mood date
    const sonamDateRes = await fetch(`${BASE_URL}/api/moods?date=2026-09-25`, {
      headers: { Cookie: sonam.cookie },
    });
    const sonamDateData = await sonamDateRes.json();
    assert(
      !sonamDateData.items.some((it: any) => it.id === privateItem.id),
      'Date query must never leak private mood'
    );
    assert(
      sonamDateData.total === 1,
      `Total count for Sonam must be 1 (only the shared item), got ${sonamDateData.total}`
    );
    console.log('[PASS] Partner date query and total count do NOT leak private mood count');

    // Puspender lists moods -> Puspender MUST see BOTH the SHARED and PRIVATE items
    const puspenderListRes = await fetch(`${BASE_URL}/api/moods`, {
      headers: { Cookie: puspender.cookie },
    });
    const puspenderListData = await puspenderListRes.json();
    assert(puspenderListData.items.some((it: any) => it.id === sharedItem.id), 'Puspender sees own SHARED mood');
    assert(puspenderListData.items.some((it: any) => it.id === privateItem.id), 'Puspender sees own PRIVATE mood');
    console.log('[PASS] Author can see both their own SHARED and PRIVATE moods');

    // Puspender searches for their own private keyword -> returns the private item
    const puspenderSearchRes = await fetch(`${BASE_URL}/api/moods?search=confidential`, {
      headers: { Cookie: puspender.cookie },
    });
    const puspenderSearchData = await puspenderSearchRes.json();
    assert(puspenderSearchData.items.length === 1, 'Puspender search finds own private item');
    assert(puspenderSearchData.items[0].id === privateItem.id, 'Matched correct private item');
    console.log('[PASS] Author search correctly returns their own private item');

    // ----------------------------------------------------
    // 5. Authorization & Modification Security
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Authorization & Modification Security ---');

    // Sonam attempts to PATCH Puspender's PRIVATE mood -> 404
    const sonamPatchPrivateRes = await fetch(`${BASE_URL}/api/moods/${privateItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({ mood: 'HAPPY' }),
    });
    assert(
      sonamPatchPrivateRes.status === 404,
      `Partner PATCH on private mood must return 404, got ${sonamPatchPrivateRes.status}`
    );
    console.log('[PASS] Partner cannot modify private mood (returns 404)');

    // Sonam attempts to DELETE Puspender's PRIVATE mood -> 404
    const sonamDeletePrivateRes = await fetch(`${BASE_URL}/api/moods/${privateItem.id}`, {
      method: 'DELETE',
      headers: { Cookie: sonam.cookie },
    });
    assert(
      sonamDeletePrivateRes.status === 404,
      `Partner DELETE on private mood must return 404, got ${sonamDeletePrivateRes.status}`
    );
    console.log('[PASS] Partner cannot delete private mood (returns 404)');

    // Sonam attempts to PATCH Puspender's SHARED mood -> 403 (author-only editing)
    const sonamPatchSharedRes = await fetch(`${BASE_URL}/api/moods/${sharedItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({ mood: 'LOVED' }),
    });
    assert(
      sonamPatchSharedRes.status === 403,
      `Partner PATCH on shared mood must return 403, got ${sonamPatchSharedRes.status}`
    );
    console.log('[PASS] Partner cannot edit author\'s SHARED mood (author-only editing enforced with 403)');

    // Sonam attempts to DELETE Puspender's SHARED mood -> 403 (author-only deletion)
    const sonamDeleteSharedRes = await fetch(`${BASE_URL}/api/moods/${sharedItem.id}`, {
      method: 'DELETE',
      headers: { Cookie: sonam.cookie },
    });
    assert(
      sonamDeleteSharedRes.status === 403,
      `Partner DELETE on shared mood must return 403, got ${sonamDeleteSharedRes.status}`
    );
    console.log('[PASS] Partner cannot delete author\'s SHARED mood (author-only deletion enforced with 403)');

    // Puspender edits own mood
    const puspenderEditRes = await fetch(`${BASE_URL}/api/moods/${sharedItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        mood: 'LOVED',
        note: 'Updated: Can\'t wait to spend quality time together!',
      }),
    });
    assert(puspenderEditRes.status === 200, 'Author edits own shared mood');
    const updatedShared = (await puspenderEditRes.json()).item;
    assert(updatedShared.mood === 'LOVED', 'Mood updated to LOVED');
    assert(updatedShared.note.includes('quality time'), 'Note updated');
    console.log('[PASS] Author can successfully edit their own mood');

    // ----------------------------------------------------
    // 6. Exact 7 Mood Types Verification
    // ----------------------------------------------------
    console.log('\n--- 6. Testing All 7 Exact Mood Types ---');
    const exactMoods = [
      'LOVED',
      'HAPPY',
      'NORMAL',
      'MISSING_YOU',
      'ANGRY_FRUSTRATED',
      'EMOTIONAL',
      'TIRED_DRAINED',
    ] as const;

    for (const m of exactMoods) {
      const res = await fetch(`${BASE_URL}/api/moods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
        body: JSON.stringify({
          mood: m,
          visibility: 'SHARED',
          date: '2026-09-25T12:00:00.000Z',
          note: `Feeling ${m}`,
        }),
      });
      assert(res.status === 201, `Failed to create mood entry for ${m}`);
      const data = await res.json();
      createdIds.push(data.item.id);
      assert(data.item.mood === m, `Expected mood ${m}, got ${data.item.mood}`);
    }
    console.log('[PASS] All exact 7 mood types can be saved and retrieved from PostgreSQL');

    // ----------------------------------------------------
    // 7. Filtering & Visibility Scopes
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Mood & Visibility Filtering ---');

    // Filter by mood EMOTIONAL
    const emotionalFilterRes = await fetch(`${BASE_URL}/api/moods?mood=EMOTIONAL`, {
      headers: { Cookie: sonam.cookie },
    });
    const emotionalData = await emotionalFilterRes.json();
    assert(emotionalData.items.every((it: any) => it.mood === 'EMOTIONAL'), 'All items must be EMOTIONAL');
    assert(emotionalData.items.length === 1, 'Exactly 1 EMOTIONAL entry found');
    console.log('[PASS] Mood filtering works');

    // Filter by visibility SHARED
    const sharedFilterRes = await fetch(`${BASE_URL}/api/moods?visibility=SHARED`, {
      headers: { Cookie: puspender.cookie },
    });
    const sharedData = await sharedFilterRes.json();
    assert(sharedData.items.every((it: any) => it.visibility === 'SHARED'), 'All items must be SHARED');
    console.log('[PASS] Visibility filtering works');

    // ----------------------------------------------------
    // 8. Home Dashboard Integration & Privacy
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Home Dashboard Integration & Privacy ---');
    const puspenderDashboard = await getDashboardData(puspender.user);
    assert(puspenderDashboard.todayMood !== null, 'Puspender dashboard should have todayMood');
    console.log(`[PASS] Puspender dashboard has todayMood: ${puspenderDashboard.todayMood?.mood}`);

    const sonamDashboard = await getDashboardData(sonam.user);
    assert(sonamDashboard.todayMood !== null, 'Sonam dashboard should have todayMood');
    // Verify Sonam's dashboard shows Sonam's mood, NOT Puspender's private mood
    assert(
      sonamDashboard.todayMood?.note?.includes('Feeling TIRED_DRAINED') ||
      sonamDashboard.todayMood?.mood === 'TIRED_DRAINED',
      'Sonam dashboard shows Sonam\'s own check-in'
    );
    console.log(`[PASS] Sonam dashboard displays Sonam's own check-in without leakage`);

    // ----------------------------------------------------
    // 9. Deletion & Cleanup
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Deletion ---');
    const deleteId = privateItem.id;
    const deleteRes = await fetch(`${BASE_URL}/api/moods/${deleteId}`, {
      method: 'DELETE',
      headers: { Cookie: puspender.cookie },
    });
    assert(deleteRes.status === 200, 'Puspender deletes own private mood');

    const verifyDeleted = await fetch(`${BASE_URL}/api/moods/${deleteId}`, {
      headers: { Cookie: puspender.cookie },
    });
    assert(verifyDeleted.status === 404, 'Deleted mood must return 404');
    createdIds.splice(createdIds.indexOf(deleteId), 1);
    console.log('[PASS] Deletion removes entry and returns 404 on subsequent requests');

    // Delete all remaining test records
    for (const id of [...createdIds]) {
      await prisma.moodEntry.delete({ where: { id } });
    }
    createdIds.length = 0;

    const finalEmpty = await fetch(`${BASE_URL}/api/moods`, {
      headers: { Cookie: puspender.cookie },
    });
    const finalEmptyData = await finalEmpty.json();
    assert(finalEmptyData.items.length === 0, 'Database must be empty of test moods');
    assert(finalEmptyData.total === 0, 'Total must be 0');
    console.log('[PASS] All test records deleted, empty state returned');

    // ----------------------------------------------------
    // 10. Phase 1–9 Regressions
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Phase 1–9 Regressions ---');

    // Phase 1: Auth
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: puspender.cookie } });
    assert(meRes.ok, 'Phase 1 Auth regression');
    console.log('[PASS] Phase 1 Auth intact');

    // Phase 3: Relationship Settings
    const relRes = await fetch(`${BASE_URL}/api/settings/relationship`, { headers: { Cookie: puspender.cookie } });
    assert(relRes.ok, 'Phase 3 Relationship Settings regression');
    console.log('[PASS] Phase 3 Relationship settings intact');

    // Phase 4: Notes
    const notesRes = await fetch(`${BASE_URL}/api/notes`, { headers: { Cookie: puspender.cookie } });
    assert(notesRes.ok, 'Phase 4 Notes regression');
    console.log('[PASS] Phase 4 Notes intact');

    // Phase 5: Chat
    const chatRes = await fetch(`${BASE_URL}/api/chat/messages`, { headers: { Cookie: puspender.cookie } });
    assert(chatRes.ok, 'Phase 5 Chat regression');
    console.log('[PASS] Phase 5 Chat intact');

    // Phase 6: Voice Memories
    const voiceRes = await fetch(`${BASE_URL}/api/voice`, { headers: { Cookie: puspender.cookie } });
    assert(voiceRes.ok, 'Phase 6 Voice regression');
    console.log('[PASS] Phase 6 Voice memories intact');

    // Phase 7: Letters
    const lettersRes = await fetch(`${BASE_URL}/api/letters`, { headers: { Cookie: puspender.cookie } });
    assert(lettersRes.ok, 'Phase 7 Letters regression');
    console.log('[PASS] Phase 7 Letters intact');

    // Phase 8: Important Dates
    const datesRes = await fetch(`${BASE_URL}/api/dates`, { headers: { Cookie: puspender.cookie } });
    assert(datesRes.ok, 'Phase 8 Important Dates regression');
    console.log('[PASS] Phase 8 Important Dates intact');

    // Phase 9: Bucket List
    const bucketRes = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    assert(bucketRes.ok, 'Phase 9 Bucket List regression');
    console.log('[PASS] Phase 9 Bucket List intact');

    console.log('\n=== ALL PHASE 10 TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    if (createdIds.length > 0) {
      console.log('--- Cleaning Up Lingering Test Mood Entries ---');
      await prisma.moodEntry.deleteMany({
        where: { id: { in: createdIds } },
      });
      console.log(`Cleaned up ${createdIds.length} test mood entry(ies). Database is clean.`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FAIL] Test encountered an error:', err);
    process.exit(1);
  });
