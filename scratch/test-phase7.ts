import { prisma } from '@/lib/prisma';
import { getOpenWhenSummary } from '@/lib/letters/letters.service';
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
  console.log('=== STARTING PHASE 7: OPEN WHEN LETTERS TESTS ===\n');

  // Authenticate partners
  const puspender = await login('puspender', 'sonam');
  const sonam = await login('sonam', 'puspender');
  console.log(`[PASS] Puspender authenticated (${puspender.user.id})`);
  console.log(`[PASS] Sonam authenticated (${sonam.user.id})`);

  const createdLetterIds: string[] = [];

  try {
    // ----------------------------------------------------
    // 1. Unauthenticated protections
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Unauthenticated Route Protections ---');
    const unauthGet = await fetch(`${BASE_URL}/api/letters`);
    assert(unauthGet.status === 401, `Unauth GET /api/letters must return 401, got ${unauthGet.status}`);

    const unauthPost = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', content: 'Test', recipientId: sonam.user.id, unlockAt: new Date(Date.now() + 86400000).toISOString() }),
    });
    assert(unauthPost.status === 401, `Unauth POST /api/letters must return 401, got ${unauthPost.status}`);

    const unauthGetId = await fetch(`${BASE_URL}/api/letters/some-id`);
    assert(unauthGetId.status === 401, `Unauth GET /api/letters/[id] must return 401, got ${unauthGetId.status}`);

    const unauthPatch = await fetch(`${BASE_URL}/api/letters/some-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    assert(unauthPatch.status === 401, `Unauth PATCH /api/letters/[id] must return 401, got ${unauthPatch.status}`);

    const unauthDelete = await fetch(`${BASE_URL}/api/letters/some-id`, { method: 'DELETE' });
    assert(unauthDelete.status === 401, `Unauth DELETE /api/letters/[id] must return 401, got ${unauthDelete.status}`);

    const unauthOpen = await fetch(`${BASE_URL}/api/letters/some-id/open`, { method: 'POST' });
    assert(unauthOpen.status === 401, `Unauth POST /api/letters/[id]/open must return 401, got ${unauthOpen.status}`);
    console.log('[PASS] All unauthenticated requests rejected with 401');

    // ----------------------------------------------------
    // 2. Input Validation (Title, Content, Recipient, Unlock Date)
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Input Validation ---');

    // Empty title
    const emptyTitleRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: '   ',
        content: 'Valid content',
        recipientId: sonam.user.id,
        unlockAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert(emptyTitleRes.status === 400, `Empty title must return 400, got ${emptyTitleRes.status}`);

    // Empty content
    const emptyContentRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Valid title',
        content: '   ',
        recipientId: sonam.user.id,
        unlockAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert(emptyContentRes.status === 400, `Empty content must return 400, got ${emptyContentRes.status}`);

    // Invalid recipient
    const invalidRecipientRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Valid title',
        content: 'Valid content',
        recipientId: 'random-stranger-id',
        unlockAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert(invalidRecipientRes.status === 400, `Invalid recipient must return 400, got ${invalidRecipientRes.status}`);

    // Past unlock time
    const pastUnlockRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Valid title',
        content: 'Valid content',
        recipientId: sonam.user.id,
        unlockAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      }),
    });
    assert(pastUnlockRes.status === 400, `Past unlock time must return 400, got ${pastUnlockRes.status}`);
    console.log('[PASS] Validation correctly rejected empty title, empty content, invalid recipient, and past unlockAt');

    // ----------------------------------------------------
    // 3. Create Valid Letter & Locked State Verification
    // ----------------------------------------------------
    console.log('\n--- 3. Creating Valid Letter & Testing Locked Privacy ---');
    const SECRET_CONTENT = 'PRIVATE TEST LETTER CONTENT - NEVER EXPOSE BEFORE UNLOCK';
    const LETTER_TITLE = 'Open when you miss me';
    const futureDate = new Date(Date.now() + 5 * 24 * 3600 * 1000); // 5 days in future

    const createRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: LETTER_TITLE,
        content: SECRET_CONTENT,
        recipientId: sonam.user.id,
        unlockAt: futureDate.toISOString(),
      }),
    });
    assert(createRes.status === 201, `Valid letter creation must return 201, got ${createRes.status}`);
    const createData = await createRes.json();
    assert(createData.success === true, 'createData.success must be true');
    const letterId = createData.letter.id;
    createdLetterIds.push(letterId);

    // Verify Author view
    assert(createData.letter.content === SECRET_CONTENT, 'Author must see content upon creation');
    assert(createData.letter.status === 'LOCKED', 'Letter status must be LOCKED');
    console.log('[PASS] Valid letter created by Puspender for Sonam');

    // Author GET /api/letters/[id]
    const authorGetRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      headers: { Cookie: puspender.cookie },
    });
    assert(authorGetRes.status === 200, 'Author GET must return 200');
    const authorGetData = await authorGetRes.json();
    assert(authorGetData.letter.content === SECRET_CONTENT, 'Author must see content in GET');
    console.log('[PASS] Author can view locked content');

    // ----------------------------------------------------
    // 4. Critical Privacy Check: Recipient must NOT receive content
    // ----------------------------------------------------
    console.log('\n--- 4. Critical Privacy Verification for Recipient ---');

    // Recipient GET /api/letters/[id]
    const recipientGetRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(recipientGetRes.status === 200, 'Recipient GET must return 200');
    const recipientRawText = await recipientGetRes.text();
    assert(!recipientRawText.includes(SECRET_CONTENT), 'CRITICAL: Raw HTTP response to recipient MUST NOT contain secret content!');
    const recipientGetData = JSON.parse(recipientRawText);
    assert(recipientGetData.letter.content === null, 'Recipient letter.content MUST be null while locked');
    assert(recipientGetData.letter.status === 'LOCKED', 'Status must be LOCKED for recipient');
    assert(recipientGetData.letter.title === LETTER_TITLE, 'Safe metadata title must match');
    console.log('[PASS] Recipient GET /api/letters/[id] does NOT leak content (content is null)');

    // Recipient GET /api/letters (list)
    const recipientListRes = await fetch(`${BASE_URL}/api/letters`, {
      headers: { Cookie: sonam.cookie },
    });
    const recipientListRaw = await recipientListRes.text();
    assert(!recipientListRaw.includes(SECRET_CONTENT), 'CRITICAL: List response MUST NOT contain secret content!');
    const recipientListData = JSON.parse(recipientListRaw);
    const lockedItem = recipientListData.items.find((i: any) => i.id === letterId);
    assert(lockedItem && lockedItem.content === null, 'Recipient list item content must be null');
    console.log('[PASS] Recipient GET /api/letters (list) does NOT leak content');

    // Recipient search by title
    const searchRes = await fetch(`${BASE_URL}/api/letters?search=miss+me`, {
      headers: { Cookie: sonam.cookie },
    });
    const searchRaw = await searchRes.text();
    assert(!searchRaw.includes(SECRET_CONTENT), 'CRITICAL: Search response MUST NOT contain secret content!');
    const searchData = JSON.parse(searchRaw);
    assert(searchData.items.length >= 1, 'Search by title should match letter');
    assert(searchData.items[0].content === null, 'Searched item content must be null');
    console.log('[PASS] Recipient search matches by title and does NOT leak content');

    // Search by secret content must NOT match (content is not searched)
    const contentSearchRes = await fetch(`${BASE_URL}/api/letters?search=SECRET`, {
      headers: { Cookie: sonam.cookie },
    });
    const contentSearchData = await contentSearchRes.json();
    assert(contentSearchData.items.length === 0, 'Searching by content keyword should return 0 results');
    console.log('[PASS] Content search does not reveal locked letter');

    // Dashboard summary privacy
    const summary = await getOpenWhenSummary(sonam.user.id);
    assert(summary.readyCount === 0, 'Locked letter should not be counted as ready');
    assert(summary.nextUnlockAt !== null, 'nextUnlockAt should be populated');
    const dashboardData = await getDashboardData(sonam.user);
    const dashboardJson = JSON.stringify(dashboardData);
    assert(!dashboardJson.includes(SECRET_CONTENT), 'Dashboard data must not leak locked content');
    console.log('[PASS] Dashboard summary reveals safe metadata only, zero content leakage');

    // ----------------------------------------------------
    // 5. Unauthorized mutations & premature open attempts
    // ----------------------------------------------------
    console.log('\n--- 5. Unauthorized Mutations & Early Open Attempts ---');

    // Recipient attempts to open before unlock time
    const earlyOpenRes = await fetch(`${BASE_URL}/api/letters/${letterId}/open`, {
      method: 'POST',
      headers: { Cookie: sonam.cookie },
    });
    assert(earlyOpenRes.status === 403, `Early open must be rejected with 403, got ${earlyOpenRes.status}`);
    console.log('[PASS] Early open attempt rejected with 403 Forbidden');

    // Recipient attempts to edit author's letter
    const recipientEditRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    assert(recipientEditRes.status === 403, `Recipient cannot edit letter (expected 403, got ${recipientEditRes.status})`);
    console.log('[PASS] Recipient edit rejected with 403 Forbidden');

    // Recipient attempts to delete author's letter
    const recipientDeleteRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      method: 'DELETE',
      headers: { Cookie: sonam.cookie },
    });
    assert(recipientDeleteRes.status === 403, `Recipient cannot delete letter (expected 403, got ${recipientDeleteRes.status})`);
    console.log('[PASS] Recipient delete rejected with 403 Forbidden');

    // Author attempts to open letter (only recipient can open)
    const authorOpenRes = await fetch(`${BASE_URL}/api/letters/${letterId}/open`, {
      method: 'POST',
      headers: { Cookie: puspender.cookie },
    });
    assert(authorOpenRes.status === 403, `Author cannot open letter meant for recipient (expected 403, got ${authorOpenRes.status})`);
    console.log('[PASS] Author opening recipient letter rejected with 403 Forbidden');

    // Author edits before opening
    const authorEditRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'Open when you miss me dearly' }),
    });
    assert(authorEditRes.status === 200, `Author should be able to edit before opening (got ${authorEditRes.status})`);
    const authorEditData = await authorEditRes.json();
    assert(authorEditData.letter.title === 'Open when you miss me dearly', 'Title updated');
    console.log('[PASS] Author successfully edited letter before opening');

    // ----------------------------------------------------
    // 6. Transition to READY State & Open Flow
    // ----------------------------------------------------
    console.log('\n--- 6. Transition to READY & Open Flow ---');

    // Simulate unlock time reached by setting unlockAt to 1 minute in the past
    await prisma.openWhenLetter.update({
      where: { id: letterId },
      data: { unlockAt: new Date(Date.now() - 60000) },
    });

    // Check status is now READY
    const readyGetRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      headers: { Cookie: sonam.cookie },
    });
    const readyGetData = await readyGetRes.json();
    assert(readyGetData.letter.status === 'READY', `Letter status must be READY, got ${readyGetData.letter.status}`);
    assert(readyGetData.letter.content === null, 'Recipient must still have content null before clicking Open');
    console.log('[PASS] Letter transitioned to READY status; content remains sealed until opened');

    // Now Recipient opens the letter
    const openRes = await fetch(`${BASE_URL}/api/letters/${letterId}/open`, {
      method: 'POST',
      headers: { Cookie: sonam.cookie },
    });
    assert(openRes.status === 200, `Open request must return 200, got ${openRes.status}`);
    const openData = await openRes.json();
    assert(openData.success === true, 'openData.success must be true');
    assert(openData.letter.status === 'OPENED', 'Status must be OPENED');
    assert(openData.letter.openedAt !== null, 'openedAt must be set');
    assert(openData.letter.content === SECRET_CONTENT, 'Recipient now receives secret content upon opening!');
    console.log('[PASS] Recipient successfully opened letter and received content');

    // Subsequent GET for recipient returns content
    const openedGetRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      headers: { Cookie: sonam.cookie },
    });
    const openedGetData = await openedGetRes.json();
    assert(openedGetData.letter.content === SECRET_CONTENT, 'Opened letter content remains visible on GET');
    assert(openedGetData.letter.status === 'OPENED', 'Status remains OPENED');
    console.log('[PASS] Opened letter is persistent and viewable by recipient');

    // ----------------------------------------------------
    // 7. Immutability: Edits and Deletions Rejected After Opening
    // ----------------------------------------------------
    console.log('\n--- 7. Immutability Enforcement After Opening ---');

    // Author attempts to edit opened letter
    const editAfterOpenRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'Attempted Change' }),
    });
    assert(editAfterOpenRes.status === 403, `Author editing opened letter must be rejected with 403, got ${editAfterOpenRes.status}`);
    console.log('[PASS] Author cannot edit opened letter (403 Forbidden)');

    // Author attempts to delete opened letter
    const deleteAfterOpenRes = await fetch(`${BASE_URL}/api/letters/${letterId}`, {
      method: 'DELETE',
      headers: { Cookie: puspender.cookie },
    });
    assert(deleteAfterOpenRes.status === 403, `Author deleting opened letter must be rejected with 403, got ${deleteAfterOpenRes.status}`);
    console.log('[PASS] Author cannot delete opened letter (403 Forbidden)');

    // ----------------------------------------------------
    // 8. Delete Before Opening Verification
    // ----------------------------------------------------
    console.log('\n--- 8. Delete Letter Before Opening Verification ---');
    // Create a 2nd letter to verify deletion before opening
    const tempLetterRes = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Temporary Letter To Delete',
        content: 'Temporary content',
        recipientId: sonam.user.id,
        unlockAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    const tempLetterData = await tempLetterRes.json();
    const tempId = tempLetterData.letter.id;
    createdLetterIds.push(tempId);

    // Delete by author before opened
    const deleteRes = await fetch(`${BASE_URL}/api/letters/${tempId}`, {
      method: 'DELETE',
      headers: { Cookie: puspender.cookie },
    });
    assert(deleteRes.status === 200, `Author should be able to delete unopened letter, got ${deleteRes.status}`);
    const checkDeleted = await fetch(`${BASE_URL}/api/letters/${tempId}`, {
      headers: { Cookie: puspender.cookie },
    });
    assert(checkDeleted.status === 404, 'Deleted letter must return 404');
    console.log('[PASS] Unopened letter successfully deleted by author');

    // ----------------------------------------------------
    // 9. Phase 1-6 Regressions Verification
    // ----------------------------------------------------
    console.log('\n--- 9. Regressions Verification (Phases 1-6) ---');
    // Phase 1: Auth
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: puspender.cookie } });
    assert(meRes.ok, 'Phase 1 Auth regression');
    console.log('[PASS] Phase 1 Auth intact');

    // Phase 3: Relationship Settings
    const relRes = await fetch(`${BASE_URL}/api/settings/relationship`, { headers: { Cookie: puspender.cookie } });
    assert(relRes.ok, 'Phase 3 Relationship Settings intact');
    console.log('[PASS] Phase 3 Relationship settings intact');

    // Phase 4: Notes
    const notesRes = await fetch(`${BASE_URL}/api/notes`, { headers: { Cookie: puspender.cookie } });
    assert(notesRes.ok, 'Phase 4 Notes intact');
    console.log('[PASS] Phase 4 Notes intact');

    // Phase 5: Chat
    const chatRes = await fetch(`${BASE_URL}/api/chat/messages`, { headers: { Cookie: puspender.cookie } });
    assert(chatRes.ok, 'Phase 5 Chat intact');
    console.log('[PASS] Phase 5 Chat intact');

    // Phase 6: Voice Memories
    const voiceRes = await fetch(`${BASE_URL}/api/voice`, { headers: { Cookie: puspender.cookie } });
    assert(voiceRes.ok, 'Phase 6 Voice Memories intact');
    console.log('[PASS] Phase 6 Voice memories intact');

    console.log('\n=== ALL PHASE 7 TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // ----------------------------------------------------
    // 10. Clean up test letters (Zero Mock / No test data left in DB)
    // ----------------------------------------------------
    console.log('--- Cleaning Up Test Letters ---');
    if (createdLetterIds.length > 0) {
      await prisma.openWhenLetter.deleteMany({
        where: { id: { in: createdLetterIds } },
      });
      console.log(`Deleted ${createdLetterIds.length} test letter(s). Database is clean.`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FAIL] Test encountered an error:', err);
    process.exit(1);
  });
