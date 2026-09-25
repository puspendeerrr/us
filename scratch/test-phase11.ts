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
  console.log('=== STARTING PHASE 11: RELATIONSHIP TIMELINE TESTS ===\n');

  const createdIds: string[] = [];

  try {
    // ----------------------------------------------------
    // 1. Unauthenticated Access Checks (401)
    // ----------------------------------------------------
    console.log('--- 1. Testing Unauthenticated Access (401) ---');

    const unauthGet = await fetch(`${BASE_URL}/api/timeline`);
    assert(unauthGet.status === 401, `Unauthenticated GET /api/timeline must be 401, got ${unauthGet.status}`);

    const unauthPost = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'First Day', category: 'BEGINNING', date: '2026-09-25' }),
    });
    assert(unauthPost.status === 401, `Unauthenticated POST /api/timeline must be 401, got ${unauthPost.status}`);

    const unauthGetId = await fetch(`${BASE_URL}/api/timeline/some-id`);
    assert(unauthGetId.status === 401, `Unauthenticated GET /api/timeline/[id] must be 401, got ${unauthGetId.status}`);

    const unauthPatch = await fetch(`${BASE_URL}/api/timeline/some-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    });
    assert(unauthPatch.status === 401, `Unauthenticated PATCH /api/timeline/[id] must be 401, got ${unauthPatch.status}`);

    const unauthDelete = await fetch(`${BASE_URL}/api/timeline/some-id`, {
      method: 'DELETE',
    });
    assert(unauthDelete.status === 401, `Unauthenticated DELETE /api/timeline/[id] must be 401, got ${unauthDelete.status}`);

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

    // Missing title
    const missingTitleRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ category: 'BEGINNING', date: '2026-09-25' }),
    });
    assert(missingTitleRes.status === 400, `Missing title must return 400, got ${missingTitleRes.status}`);

    // Empty title
    const emptyTitleRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: '   ', category: 'BEGINNING', date: '2026-09-25' }),
    });
    assert(emptyTitleRes.status === 400, `Empty title must return 400, got ${emptyTitleRes.status}`);

    // Oversized title (>200 chars)
    const oversizedTitleRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'T'.repeat(201), category: 'BEGINNING', date: '2026-09-25' }),
    });
    assert(oversizedTitleRes.status === 400, `Oversized title must return 400, got ${oversizedTitleRes.status}`);

    // Invalid category
    const invalidCategoryRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'Test', category: 'ROMANTIC_ERA', date: '2026-09-25' }),
    });
    assert(invalidCategoryRes.status === 400, `Invalid category must return 400, got ${invalidCategoryRes.status}`);

    // Invalid date
    const invalidDateRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({ title: 'Test', category: 'MEMORY', date: 'not-a-date' }),
    });
    assert(invalidDateRes.status === 400, `Invalid date must return 400, got ${invalidDateRes.status}`);

    // Oversized description (>3000 chars)
    const oversizedDescRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Long Story',
        category: 'MEMORY',
        date: '2026-09-25',
        description: 'D'.repeat(3001),
      }),
    });
    assert(oversizedDescRes.status === 400, `Description > 3000 chars must return 400, got ${oversizedDescRes.status}`);

    // Injected createdById rejected by strict schema
    const spoofPostRes = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Spoof Test',
        category: 'MEMORY',
        date: '2026-09-25',
        createdById: sonam.user.id,
      }),
    });
    assert(spoofPostRes.status === 400, `Injected createdById must return 400, got ${spoofPostRes.status}`);

    console.log('[PASS] Validation correctly rejected invalid title, category, date, oversized description, and field injection');

    // ----------------------------------------------------
    // 3. Shared Couple Access & Collaboration
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Shared Couple Access & Collaboration ---');

    // Puspender creates Event 1
    const createEvent1Res = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Our First Conversation',
        description: 'Talked for four hours straight on that warm evening.',
        date: '2024-05-10T12:00:00.000Z',
        category: 'BEGINNING',
      }),
    });
    assert(createEvent1Res.status === 201, 'Puspender creates event 1');
    const event1 = (await createEvent1Res.json()).item;
    createdIds.push(event1.id);
    assert(event1.createdById === puspender.user.id, 'event 1 createdById is Puspender');

    // Sonam reads timeline -> sees Event 1
    const sonamGetRes = await fetch(`${BASE_URL}/api/timeline`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(sonamGetRes.ok, 'Sonam GET /api/timeline');
    const sonamListData = await sonamGetRes.json();
    assert(sonamListData.items.some((it: any) => it.id === event1.id), 'Sonam sees event created by Puspender');
    console.log('[PASS] Sonam sees event created by Puspender');

    // Sonam creates Event 2
    const createEvent2Res = await fetch(`${BASE_URL}/api/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: 'Road Trip to Shimla',
        description: 'Driving through foggy hills and drinking chai at roadside stalls.',
        date: '2024-11-15T12:00:00.000Z',
        category: 'TRIP',
      }),
    });
    assert(createEvent2Res.status === 201, 'Sonam creates event 2');
    const event2 = (await createEvent2Res.json()).item;
    createdIds.push(event2.id);

    // Puspender reads timeline -> sees both events
    const puspenderGetRes = await fetch(`${BASE_URL}/api/timeline`, {
      headers: { Cookie: puspender.cookie },
    });
    const puspenderListData = await puspenderGetRes.json();
    assert(puspenderListData.items.some((it: any) => it.id === event1.id), 'Puspender sees event 1');
    assert(puspenderListData.items.some((it: any) => it.id === event2.id), 'Puspender sees event 2');
    console.log('[PASS] Both partners see shared timeline events');

    // Sonam edits Event 1 (created by Puspender)
    const sonamEditRes = await fetch(`${BASE_URL}/api/timeline/${event1.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: 'Our First Conversation Over Coffee',
        description: 'Talked for five hours straight and laughed endlessly.',
      }),
    });
    assert(sonamEditRes.status === 200, 'Sonam edits event 1');
    const updatedEvent1 = (await sonamEditRes.json()).item;
    assert(updatedEvent1.title === 'Our First Conversation Over Coffee', 'Title was updated by partner');
    assert(updatedEvent1.createdById === puspender.user.id, 'Original author preserved');
    console.log('[PASS] Either partner can edit shared timeline event while preserving author attribution');

    // Puspender edits Event 2 (created by Sonam)
    const puspenderEditRes = await fetch(`${BASE_URL}/api/timeline/${event2.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Road Trip to Shimla Hills',
      }),
    });
    assert(puspenderEditRes.status === 200, 'Puspender edits event 2');
    const updatedEvent2 = (await puspenderEditRes.json()).item;
    assert(updatedEvent2.title === 'Road Trip to Shimla Hills', 'Puspender updated event 2 title');
    console.log('[PASS] Both partners can collaborate on shared events');

    // ----------------------------------------------------
    // 4. Exact 6 Categories Verification
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Exact 6 Categories ---');
    const exactCategories = [
      'BEGINNING',
      'MILESTONE',
      'TRIP',
      'MEMORY',
      'ACHIEVEMENT',
      'CUSTOM',
    ] as const;

    for (const cat of exactCategories) {
      const res = await fetch(`${BASE_URL}/api/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
        body: JSON.stringify({
          title: `Category test: ${cat}`,
          category: cat,
          date: '2025-01-01T12:00:00.000Z',
          description: `Testing ${cat}`,
        }),
      });
      assert(res.status === 201, `Failed to create event with category ${cat}`);
      const data = await res.json();
      createdIds.push(data.item.id);
      assert(data.item.category === cat, `Expected category ${cat}, got ${data.item.category}`);
    }
    console.log('[PASS] All 6 exact categories successfully created and stored in PostgreSQL');

    // ----------------------------------------------------
    // 5. Search & Category Filters
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Search and Category Filtering ---');

    // Search by title
    const searchTitleRes = await fetch(`${BASE_URL}/api/timeline?search=Coffee`, {
      headers: { Cookie: sonam.cookie },
    });
    const searchTitleData = await searchTitleRes.json();
    assert(searchTitleData.items.length === 1, `Expected 1 match for "Coffee", got ${searchTitleData.items.length}`);
    assert(searchTitleData.items[0].id === event1.id, 'Title search matched correct event');
    console.log('[PASS] Search by title works via PostgreSQL');

    // Search by description
    const searchDescRes = await fetch(`${BASE_URL}/api/timeline?search=roadside`, {
      headers: { Cookie: puspender.cookie },
    });
    const searchDescData = await searchDescRes.json();
    assert(searchDescData.items.length === 1, `Expected 1 match for "roadside", got ${searchDescData.items.length}`);
    assert(searchDescData.items[0].id === event2.id, 'Description search matched correct event');
    console.log('[PASS] Search by description works via PostgreSQL');

    // Category filter: TRIP
    const tripCatRes = await fetch(`${BASE_URL}/api/timeline?category=TRIP`, {
      headers: { Cookie: sonam.cookie },
    });
    const tripCatData = await tripCatRes.json();
    assert(tripCatData.items.every((it: any) => it.category === 'TRIP'), 'All returned items must have category TRIP');
    assert(tripCatData.items.length >= 2, 'Found all TRIP items');
    console.log('[PASS] Category filter works via PostgreSQL');

    // Combined search + category
    const combinedRes = await fetch(`${BASE_URL}/api/timeline?category=TRIP&search=Shimla`, {
      headers: { Cookie: puspender.cookie },
    });
    const combinedData = await combinedRes.json();
    assert(combinedData.items.length === 1, `Expected 1 combined match, got ${combinedData.items.length}`);
    assert(combinedData.items[0].id === event2.id, 'Combined filter matched Shimla event');
    console.log('[PASS] Combined search + category filter works');

    // ----------------------------------------------------
    // 6. Deterministic Ordering
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Deterministic Ordering ---');

    // Default newest first (desc)
    const descRes = await fetch(`${BASE_URL}/api/timeline?order=desc`, {
      headers: { Cookie: sonam.cookie },
    });
    const descData = await descRes.json();
    for (let i = 0; i < descData.items.length - 1; i++) {
      const curDate = new Date(descData.items[i].date).getTime();
      const nextDate = new Date(descData.items[i + 1].date).getTime();
      assert(curDate >= nextDate, `Order DESC violated: item ${i} (${curDate}) < item ${i+1} (${nextDate})`);
    }
    console.log('[PASS] Deterministic descending order verified (newest first)');

    // Ascending order (oldest first)
    const ascRes = await fetch(`${BASE_URL}/api/timeline?order=asc`, {
      headers: { Cookie: puspender.cookie },
    });
    const ascData = await ascRes.json();
    for (let i = 0; i < ascData.items.length - 1; i++) {
      const curDate = new Date(ascData.items[i].date).getTime();
      const nextDate = new Date(ascData.items[i + 1].date).getTime();
      assert(curDate <= nextDate, `Order ASC violated: item ${i} (${curDate}) > item ${i+1} (${nextDate})`);
    }
    console.log('[PASS] Deterministic ascending order verified (oldest first)');

    // ----------------------------------------------------
    // 7. Home Dashboard Integration
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Home Dashboard Integration ---');
    const dashboardData = await getDashboardData(puspender.user);
    assert(dashboardData.latestTimeline !== null, 'latestTimeline should not be null');
    const lt = dashboardData.latestTimeline!;
    assert(typeof lt.title === 'string', 'latestTimeline.title is string');
    assert(typeof lt.eventDate === 'string', 'latestTimeline.eventDate is string');
    console.log(`[PASS] Home dashboard integrates latest timeline memory: "${lt.title}" (${lt.eventDate})`);

    // ----------------------------------------------------
    // 8. Deletion & Empty State
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Deletion & Empty State ---');

    // Sonam deletes event 1
    const delEvent1Res = await fetch(`${BASE_URL}/api/timeline/${event1.id}`, {
      method: 'DELETE',
      headers: { Cookie: sonam.cookie },
    });
    assert(delEvent1Res.status === 200, 'Delete event 1');

    const verifyDelEvent1 = await fetch(`${BASE_URL}/api/timeline/${event1.id}`, {
      headers: { Cookie: puspender.cookie },
    });
    assert(verifyDelEvent1.status === 404, 'Deleted event 1 returns 404');
    createdIds.splice(createdIds.indexOf(event1.id), 1);
    console.log('[PASS] Partner can delete shared timeline event, subsequent GET returns 404');

    // Clean up all remaining test timeline events
    for (const id of [...createdIds]) {
      const delRes = await fetch(`${BASE_URL}/api/timeline/${id}`, {
        method: 'DELETE',
        headers: { Cookie: puspender.cookie },
      });
      assert(delRes.status === 200, `Delete ${id} returns 200`);
    }
    createdIds.length = 0;

    const finalEmpty = await fetch(`${BASE_URL}/api/timeline`, {
      headers: { Cookie: puspender.cookie },
    });
    const finalEmptyData = await finalEmpty.json();
    assert(finalEmptyData.items.length === 0, 'Timeline must be empty');
    assert(finalEmptyData.total === 0, 'Total count must be 0');
    console.log('[PASS] All test events deleted, genuine empty state returned');

    // ----------------------------------------------------
    // 9. Phase 1–10 Regressions
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Phase 1–10 Regressions ---');

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

    // Phase 10: Mood Journal
    const moodRes = await fetch(`${BASE_URL}/api/moods`, { headers: { Cookie: puspender.cookie } });
    assert(moodRes.ok, 'Phase 10 Mood Journal regression');
    console.log('[PASS] Phase 10 Mood Journal intact');

    console.log('\n=== ALL PHASE 11 TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    if (createdIds.length > 0) {
      console.log('--- Cleaning Up Lingering Test Timeline Events ---');
      await prisma.timelineEvent.deleteMany({
        where: { id: { in: createdIds } },
      });
      console.log(`Cleaned up ${createdIds.length} test timeline event(s). Database is clean.`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FAIL] Test encountered an error:', err);
    process.exit(1);
  });
