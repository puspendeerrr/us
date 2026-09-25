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
  console.log('=== STARTING PHASE 9: BUCKET LIST TESTS ===\n');

  const createdIds: string[] = [];

  try {
    // ----------------------------------------------------
    // 1. Security & Authentication Checks
    // ----------------------------------------------------
    console.log('--- 1. Testing Unauthenticated Access (401) ---');

    const unauthGet = await fetch(`${BASE_URL}/api/bucket-list`);
    assert(unauthGet.status === 401, `Unauthenticated GET must be 401, got ${unauthGet.status}`);

    const unauthPost = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test item', category: 'TRAVEL' }),
    });
    assert(unauthPost.status === 401, `Unauthenticated POST must be 401, got ${unauthPost.status}`);

    const unauthPatch = await fetch(`${BASE_URL}/api/bucket-list/some-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: true }),
    });
    assert(unauthPatch.status === 401, `Unauthenticated PATCH must be 401, got ${unauthPatch.status}`);

    const unauthDelete = await fetch(`${BASE_URL}/api/bucket-list/some-id`, {
      method: 'DELETE',
    });
    assert(unauthDelete.status === 401, `Unauthenticated DELETE must be 401, got ${unauthDelete.status}`);

    console.log('[PASS] All unauthenticated endpoints correctly return 401');

    // ----------------------------------------------------
    // Authenticate Partners
    // ----------------------------------------------------
    console.log('\n--- Authenticating Couple Partners ---');
    const puspender = await login('puspender', 'sonam');
    const sonam = await login('sonam', 'puspender');
    assert(puspender.user.id !== sonam.user.id, 'Users must have different IDs');
    console.log(`[PASS] Puspender (${puspender.user.id}) & Sonam (${sonam.user.id}) logged in`);

    // ----------------------------------------------------
    // 2. Validation Testing
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Zod Input Validation ---');

    // Empty title
    const emptyTitleRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: '   ', category: 'TRAVEL' }),
    });
    assert(emptyTitleRes.status === 400, `Empty title must return 400, got ${emptyTitleRes.status}`);

    // Too long title (> 200 chars)
    const longTitleRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'A'.repeat(201), category: 'TRAVEL' }),
    });
    assert(longTitleRes.status === 400, `Title > 200 chars must return 400, got ${longTitleRes.status}`);

    // Invalid category
    const invalidCatRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'Fly to Mars', category: 'INTERSTELLAR' }),
    });
    assert(invalidCatRes.status === 400, `Invalid category must return 400, got ${invalidCatRes.status}`);

    console.log('[PASS] Validation correctly rejected empty title, oversized title, and invalid category');

    // ----------------------------------------------------
    // 3. Spoofing Prevention
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Spoofing Prevention ---');

    // Attempting to spoof createdById
    const spoofPostRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Spoofed Item',
        category: 'TRAVEL',
        createdById: sonam.user.id, // Attempt to spoof Sonam as author
      }),
    });
    assert(spoofPostRes.status === 201, 'POST with extra createdById field should succeed or ignore');
    const spoofData = await spoofPostRes.json();
    createdIds.push(spoofData.item.id);
    assert(spoofData.item.createdById === puspender.user.id, 'createdById MUST match session user, not spoofed body');
    console.log('[PASS] createdById cannot be spoofed (authenticated session enforced)');

    // Attempting to spoof completedAt on creation
    assert(spoofData.item.isCompleted === false, 'New item must be incomplete');
    assert(spoofData.item.completedAt === null, 'New item completedAt must be null regardless of client payload');

    // Attempting to spoof completedAt on PATCH
    const fakeTimestamp = '2020-01-01T00:00:00.000Z';
    const spoofPatchRes = await fetch(`${BASE_URL}/api/bucket-list/${spoofData.item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        isCompleted: true,
        completedAt: fakeTimestamp,
      }),
    });
    assert(spoofPatchRes.status === 200, 'PATCH should succeed');
    const patchedData = await spoofPatchRes.json();
    assert(patchedData.item.isCompleted === true, 'Item is completed');
    assert(patchedData.item.completedAt !== fakeTimestamp, 'Server must override client completedAt with current timestamp');
    const serverTimeDiff = Math.abs(new Date(patchedData.item.completedAt).getTime() - Date.now());
    assert(serverTimeDiff < 5000, `completedAt must be within 5 seconds of now, diff was ${serverTimeDiff}ms`);
    console.log('[PASS] completedAt cannot be spoofed (server timestamp enforced)');

    // Delete spoof test item
    await fetch(`${BASE_URL}/api/bucket-list/${spoofData.item.id}`, {
      method: 'DELETE',
      headers: { Cookie: puspender.cookie },
    });
    createdIds.splice(createdIds.indexOf(spoofData.item.id), 1);

    // ----------------------------------------------------
    // 4. Couple Sharing & Collaboration CRUD
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Couple Sharing & CRUD ---');

    // Puspender creates item A
    const itemARes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Explore Tokyo and Kyoto',
        description: 'Walk Shibuya crossing and visit Fushimi Inari shrine',
        category: 'TRAVEL',
      }),
    });
    assert(itemARes.status === 201, 'Puspender create item A');
    const itemA = (await itemARes.json()).item;
    createdIds.push(itemA.id);
    assert(itemA.createdById === puspender.user.id, 'itemA created by Puspender');

    // Sonam reads list -> sees item A
    const sonamGetRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(sonamGetRes.ok, 'Sonam GET bucket list');
    const sonamListData = await sonamGetRes.json();
    const foundItemA = sonamListData.items.find((it: any) => it.id === itemA.id);
    assert(foundItemA !== undefined, 'Sonam must see item created by Puspender');
    console.log('[PASS] Sonam can see item created by Puspender');

    // Sonam creates item B
    const itemBRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: 'Pottery Workshop',
        description: 'Make ceramic mugs for each other',
        category: 'LEARNING',
      }),
    });
    assert(itemBRes.status === 201, 'Sonam create item B');
    const itemB = (await itemBRes.json()).item;
    createdIds.push(itemB.id);

    // Puspender reads list -> sees both item A and item B
    const puspenderGetRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      headers: { Cookie: puspender.cookie },
    });
    const puspenderListData = await puspenderGetRes.json();
    assert(puspenderListData.items.some((it: any) => it.id === itemA.id), 'Puspender sees item A');
    assert(puspenderListData.items.some((it: any) => it.id === itemB.id), 'Puspender sees item B');
    console.log('[PASS] Shared couple visibility verified: both partners see all shared items');

    // Sonam edits item A (created by Puspender)
    const editItemARes = await fetch(`${BASE_URL}/api/bucket-list/${itemA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: 'Explore Tokyo, Kyoto, and Osaka',
        description: 'Walk Shibuya crossing, visit Fushimi Inari, eat Dotonbori street food',
        category: 'TRAVEL',
      }),
    });
    assert(editItemARes.status === 200, 'Sonam edits item A');
    const updatedItemA = (await editItemARes.json()).item;
    assert(updatedItemA.title === 'Explore Tokyo, Kyoto, and Osaka', 'Title updated by partner');
    assert(updatedItemA.createdById === puspender.user.id, 'Original author preserved');
    console.log('[PASS] Partner can edit shared bucket item while preserving immutable fields');

    // ----------------------------------------------------
    // 5. Completion Lifecycle & Server Timestamps
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Completion Lifecycle & Server Timestamps ---');

    // Create item C
    const itemCRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Watch Studio Ghibli Marathon',
        description: 'Spirited Away, Howls Moving Castle, Totoro',
        category: 'MOVIES',
      }),
    });
    const itemC = (await itemCRes.json()).item;
    createdIds.push(itemC.id);

    // Verify initial completion state
    assert(itemC.isCompleted === false, 'Initially isCompleted must be false');
    assert(itemC.completedAt === null, 'Initially completedAt must be null');

    // Complete item C
    const beforeCompleteTime = Date.now();
    const completeRes = await fetch(`${BASE_URL}/api/bucket-list/${itemC.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({ isCompleted: true }),
    });
    assert(completeRes.ok, 'Complete item C');
    const completedItemC = (await completeRes.json()).item;
    assert(completedItemC.isCompleted === true, 'isCompleted must be true');
    assert(completedItemC.completedAt !== null, 'completedAt must be populated');
    const firstCompletedTimestamp = new Date(completedItemC.completedAt).getTime();
    assert(firstCompletedTimestamp >= beforeCompleteTime - 1000, 'completedAt must be fresh server timestamp');
    console.log(`[PASS] Completed successfully at server timestamp: ${completedItemC.completedAt}`);

    // Uncomplete item C
    const uncompleteRes = await fetch(`${BASE_URL}/api/bucket-list/${itemC.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ isCompleted: false }),
    });
    assert(uncompleteRes.ok, 'Uncomplete item C');
    const uncompletedItemC = (await uncompleteRes.json()).item;
    assert(uncompletedItemC.isCompleted === false, 'isCompleted must be reset to false');
    assert(uncompletedItemC.completedAt === null, 'completedAt must be reset to null');
    console.log('[PASS] Uncompleted successfully: isCompleted=false, completedAt=null');

    // Re-complete item C after delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    const recompleteRes = await fetch(`${BASE_URL}/api/bucket-list/${itemC.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({ isCompleted: true }),
    });
    const recompletedItemC = (await recompleteRes.json()).item;
    assert(recompletedItemC.isCompleted === true, 'isCompleted is true on recompletion');
    const secondCompletedTimestamp = new Date(recompletedItemC.completedAt).getTime();
    assert(secondCompletedTimestamp > firstCompletedTimestamp, 'Recompletion must generate a new newer server timestamp');
    console.log(`[PASS] Re-completed with updated timestamp: ${recompletedItemC.completedAt}`);

    // ----------------------------------------------------
    // 6. Progress Calculation Testing
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Progress Calculation ---');
    // Current state: 3 items (itemA incomplete, itemB incomplete, itemC completed)
    // Total: 3, Completed: 1 -> 33.33%
    const progress1Res = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    const progress1 = (await progress1Res.json()).progress;
    assert(progress1.totalCount === 3, `Expected totalCount 3, got ${progress1.totalCount}`);
    assert(progress1.completedCount === 1, `Expected completedCount 1, got ${progress1.completedCount}`);
    assert(progress1.percentage === 33.33, `Expected percentage 33.33%, got ${progress1.percentage}%`);
    console.log(`[PASS] 1 of 3 completed -> ${progress1.percentage}%`);

    // Complete item B (2 of 3 -> 66.67%)
    await fetch(`${BASE_URL}/api/bucket-list/${itemB.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ isCompleted: true }),
    });
    const progress2Res = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    const progress2 = (await progress2Res.json()).progress;
    assert(progress2.completedCount === 2, `Expected completedCount 2, got ${progress2.completedCount}`);
    assert(progress2.percentage === 66.67, `Expected percentage 66.67%, got ${progress2.percentage}%`);
    console.log(`[PASS] 2 of 3 completed -> ${progress2.percentage}%`);

    // Complete item A (3 of 3 -> 100%)
    await fetch(`${BASE_URL}/api/bucket-list/${itemA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ isCompleted: true }),
    });
    const progress3Res = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    const progress3 = (await progress3Res.json()).progress;
    assert(progress3.completedCount === 3, `Expected completedCount 3, got ${progress3.completedCount}`);
    assert(progress3.percentage === 100, `Expected percentage 100%, got ${progress3.percentage}%`);
    console.log(`[PASS] 3 of 3 completed -> ${progress3.percentage}%`);

    // Delete item B (leaving 2 items, both completed -> 2/2 = 100%)
    await fetch(`${BASE_URL}/api/bucket-list/${itemB.id}`, {
      method: 'DELETE',
      headers: { Cookie: sonam.cookie },
    });
    createdIds.splice(createdIds.indexOf(itemB.id), 1);

    const progress4Res = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    const progress4 = (await progress4Res.json()).progress;
    assert(progress4.totalCount === 2, `Expected totalCount 2, got ${progress4.totalCount}`);
    assert(progress4.completedCount === 2, `Expected completedCount 2, got ${progress4.completedCount}`);
    assert(progress4.percentage === 100, `Expected percentage 100%, got ${progress4.percentage}%`);
    console.log(`[PASS] Recalculated after deletion: 2 of 2 completed -> ${progress4.percentage}%`);

    // ----------------------------------------------------
    // 7. Search & Filter Testing
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Search and Filtering ---');

    // Create a food item for search & category filtering
    const ramenRes = await fetch(`${BASE_URL}/api/bucket-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Authentic Tonkotsu Ramen',
        description: 'Try the famous Ichiran ramen broth together',
        category: 'FOOD',
      }),
    });
    const ramenItem = (await ramenRes.json()).item;
    createdIds.push(ramenItem.id);

    // Title search: "Tonkotsu"
    const titleSearchRes = await fetch(`${BASE_URL}/api/bucket-list?search=Tonkotsu`, {
      headers: { Cookie: sonam.cookie },
    });
    const titleSearchData = await titleSearchRes.json();
    assert(titleSearchData.items.length === 1, `Expected 1 match for "Tonkotsu", got ${titleSearchData.items.length}`);
    assert(titleSearchData.items[0].id === ramenItem.id, 'Matched correct ramen item on title search');
    console.log('[PASS] Title search works via PostgreSQL');

    // Description search: "Ichiran"
    const descSearchRes = await fetch(`${BASE_URL}/api/bucket-list?search=Ichiran`, {
      headers: { Cookie: puspender.cookie },
    });
    const descSearchData = await descSearchRes.json();
    assert(descSearchData.items.length === 1, `Expected 1 match for "Ichiran", got ${descSearchData.items.length}`);
    assert(descSearchData.items[0].id === ramenItem.id, 'Matched correct ramen item on description search');
    console.log('[PASS] Description search works via PostgreSQL');

    // Category filter: FOOD
    const foodCatRes = await fetch(`${BASE_URL}/api/bucket-list?category=FOOD`, {
      headers: { Cookie: sonam.cookie },
    });
    const foodCatData = await foodCatRes.json();
    assert(foodCatData.items.every((it: any) => it.category === 'FOOD'), 'All returned items must have FOOD category');
    assert(foodCatData.items.some((it: any) => it.id === ramenItem.id), 'Includes ramen item');
    console.log('[PASS] Category filter works via PostgreSQL');

    // Status filter: active vs completed
    const activeRes = await fetch(`${BASE_URL}/api/bucket-list?status=active`, {
      headers: { Cookie: puspender.cookie },
    });
    const activeData = await activeRes.json();
    assert(activeData.items.every((it: any) => it.isCompleted === false), 'All returned items must be active (incomplete)');
    assert(activeData.items.some((it: any) => it.id === ramenItem.id), 'Active filter includes incomplete ramen');

    const completedRes = await fetch(`${BASE_URL}/api/bucket-list?status=completed`, {
      headers: { Cookie: puspender.cookie },
    });
    const completedData = await completedRes.json();
    assert(completedData.items.every((it: any) => it.isCompleted === true), 'All returned items must be completed');
    console.log('[PASS] Status filters (active/completed) work via PostgreSQL');

    // Combined search + category + status
    const combinedRes = await fetch(
      `${BASE_URL}/api/bucket-list?status=active&category=FOOD&search=ramen`,
      { headers: { Cookie: sonam.cookie } }
    );
    const combinedData = await combinedRes.json();
    assert(combinedData.items.length === 1, 'Combined filters return exactly 1 matching item');
    assert(combinedData.items[0].id === ramenItem.id, 'Combined filter matched ramen item');
    console.log('[PASS] Combined search + category + status filtering works');

    // ----------------------------------------------------
    // 8. Home Dashboard Integration
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Home Dashboard Integration ---');
    const dashboardData = await getDashboardData(puspender.user);
    assert(dashboardData.bucketProgress !== null && dashboardData.bucketProgress !== undefined, 'Dashboard data must contain bucketProgress');
    const bProg = dashboardData.bucketProgress!;
    assert(typeof bProg.totalCount === 'number', 'totalCount is number');
    assert(typeof bProg.completedCount === 'number', 'completedCount is number');
    assert(typeof bProg.percentage === 'number', 'percentage is number');
    assert(bProg.totalCount === 3, `Expected dashboard totalCount 3, got ${bProg.totalCount}`);
    assert(bProg.completedCount === 2, `Expected dashboard completedCount 2, got ${bProg.completedCount}`);
    assert(bProg.percentage === 66.67, `Expected dashboard percentage 66.67%, got ${bProg.percentage}%`);
    console.log(`[PASS] Dashboard returns real PostgreSQL bucket progress: ${bProg.completedCount}/${bProg.totalCount} (${bProg.percentage}%)`);

    // ----------------------------------------------------
    // 9. Deleting Remaining Test Items
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Deletion & Empty State ---');
    for (const id of [...createdIds]) {
      const delRes = await fetch(`${BASE_URL}/api/bucket-list/${id}`, {
        method: 'DELETE',
        headers: { Cookie: puspender.cookie },
      });
      assert(delRes.status === 200, `Delete ${id} must return 200`);
    }
    createdIds.length = 0;

    const emptyRes = await fetch(`${BASE_URL}/api/bucket-list`, { headers: { Cookie: puspender.cookie } });
    const emptyData = await emptyRes.json();
    assert(emptyData.items.length === 0, 'Bucket list must be empty after deleting all items');
    assert(emptyData.progress.totalCount === 0, 'totalCount must be 0');
    assert(emptyData.progress.completedCount === 0, 'completedCount must be 0');
    assert(emptyData.progress.percentage === 0, 'percentage must be 0');
    console.log('[PASS] Deleted all test items. Zero items in list, progress is 0/0 (0%)');

    // ----------------------------------------------------
    // 10. Phase 1–8 Regressions
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Phase 1–8 Regressions ---');

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

    console.log('\n=== ALL PHASE 9 TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Teardown safety: ensure no test bucket items linger
    if (createdIds.length > 0) {
      console.log('--- Cleaning Up Test Bucket Items ---');
      await prisma.bucketItem.deleteMany({
        where: { id: { in: createdIds } },
      });
      console.log(`Cleaned up ${createdIds.length} test item(s). Database is clean.`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FAIL] Test encountered an error:', err);
    process.exit(1);
  });
