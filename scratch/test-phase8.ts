import { prisma } from '@/lib/prisma';
import { computeDateOccurrences, isLeapYear, getRecurringDateInYear } from '@/lib/dates/dates.utils';
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
  console.log('=== STARTING PHASE 8: IMPORTANT DATES TESTS ===\n');

  // ----------------------------------------------------
  // Unit / Boundary Tests for Date Calculations
  // ----------------------------------------------------
  console.log('--- 1. Testing Date Calculations & Boundaries ---');

  // Baseline simulated "now": 2026-09-25T12:00:00Z
  const simNow = new Date(Date.UTC(2026, 8, 25, 12, 0, 0)); // 25 September 2026

  // 1. Today (non-recurring)
  const todayNonRec = computeDateOccurrences(new Date(Date.UTC(2026, 8, 25, 0, 0, 0)), false, simNow);
  assert(todayNonRec.isToday === true, 'Expected isToday to be true');
  assert(todayNonRec.daysUntil === 0, 'Expected daysUntil to be 0 for today');
  assert(todayNonRec.isPast === false, 'Expected isPast to be false for today');
  assert(todayNonRec.nextOccurrence !== null, 'Expected nextOccurrence to not be null');

  // 2. Today (recurring)
  const todayRec = computeDateOccurrences(new Date(Date.UTC(2020, 8, 25, 0, 0, 0)), true, simNow);
  assert(todayRec.isToday === true, 'Expected recurring today isToday to be true');
  assert(todayRec.daysUntil === 0, 'Expected recurring today daysUntil to be 0');

  // 3. Tomorrow (non-recurring)
  const tomorrow = computeDateOccurrences(new Date(Date.UTC(2026, 8, 26, 0, 0, 0)), false, simNow);
  assert(tomorrow.isToday === false, 'Expected tomorrow isToday to be false');
  assert(tomorrow.daysUntil === 1, `Expected tomorrow daysUntil = 1, got ${tomorrow.daysUntil}`);
  assert(tomorrow.isPast === false, 'Expected tomorrow isPast to be false');

  // 4. Yesterday (non-recurring)
  const yesterdayNonRec = computeDateOccurrences(new Date(Date.UTC(2026, 8, 24, 0, 0, 0)), false, simNow);
  assert(yesterdayNonRec.isToday === false, 'Expected yesterday isToday to be false');
  assert(yesterdayNonRec.isPast === true, 'Expected yesterday isPast to be true');
  assert(yesterdayNonRec.daysUntil === -1, 'Expected yesterday daysUntil = -1');
  assert(yesterdayNonRec.nextOccurrence === null, 'Expected past non-recurring nextOccurrence to be null');

  // 5. Yesterday (recurring): Should roll forward to next year
  const yesterdayRec = computeDateOccurrences(new Date(Date.UTC(2020, 8, 24, 0, 0, 0)), true, simNow);
  assert(yesterdayRec.isToday === false, 'Expected yesterday recurring isToday to be false');
  assert(yesterdayRec.isPast === false, 'Expected recurring date isPast to be false');
  assert(yesterdayRec.daysUntil > 300, `Expected recurring yesterday daysUntil > 300, got ${yesterdayRec.daysUntil}`);
  const nextOccYear = new Date(yesterdayRec.nextOccurrence!).getUTCFullYear();
  assert(nextOccYear === 2027, `Expected nextOccurrence in 2027, got ${nextOccYear}`);

  // 6. 7 days from now
  const sevenDays = computeDateOccurrences(new Date(Date.UTC(2026, 9, 2, 0, 0, 0)), false, simNow); // Oct 2, 2026
  assert(sevenDays.daysUntil === 7, `Expected 7 days until, got ${sevenDays.daysUntil}`);

  // 7. Year Boundary: December 31 -> January 1
  const dec31 = new Date(Date.UTC(2026, 11, 31, 10, 0, 0));
  const jan1Rec = computeDateOccurrences(new Date(Date.UTC(2020, 0, 1, 0, 0, 0)), true, dec31);
  assert(jan1Rec.daysUntil === 1, `Expected Jan 1 to be 1 day from Dec 31, got ${jan1Rec.daysUntil}`);
  assert(new Date(jan1Rec.nextOccurrence!).getUTCFullYear() === 2027, 'Next occurrence should be 2027');

  // 8. Leap Year tests
  assert(isLeapYear(2024) === true, '2024 is a leap year');
  assert(isLeapYear(2025) === false, '2025 is not a leap year');
  assert(isLeapYear(2026) === false, '2026 is not a leap year');
  assert(isLeapYear(2028) === true, '2028 is a leap year');
  assert(isLeapYear(2000) === true, '2000 is a leap year');
  assert(isLeapYear(1900) === false, '1900 is not a leap year');

  // 9. February 29 Recurring Date in Non-Leap vs Leap Years
  // In non-leap year 2027:
  const feb29In2027 = getRecurringDateInYear(2027, 1, 29);
  assert(feb29In2027.getUTCMonth() === 1, 'Should be February');
  assert(feb29In2027.getUTCDate() === 28, 'Should deterministically resolve to Feb 28 in non-leap year 2027');

  // In leap year 2028:
  const feb29In2028 = getRecurringDateInYear(2028, 1, 29);
  assert(feb29In2028.getUTCMonth() === 1, 'Should be February');
  assert(feb29In2028.getUTCDate() === 29, 'Should resolve to Feb 29 in leap year 2028');

  // 10. Midnight boundary test
  const midnightStart = new Date(Date.UTC(2026, 8, 25, 0, 0, 0));
  const midnightEnd = new Date(Date.UTC(2026, 8, 25, 23, 59, 59));
  const testDate = new Date(Date.UTC(2026, 8, 25, 0, 0, 0));
  assert(computeDateOccurrences(testDate, false, midnightStart).isToday === true, 'Midnight start should be today');
  assert(computeDateOccurrences(testDate, false, midnightEnd).isToday === true, 'Midnight end should be today');

  console.log('[PASS] All 15 date calculation, leap-year, and recurrence boundary tests passed.');

  // ----------------------------------------------------
  // Authentication & API Protections
  // ----------------------------------------------------
  console.log('\n--- 2. Testing API Authorization & Protections ---');
  const puspender = await login('puspender', 'sonam');
  const sonam = await login('sonam', 'puspender');

  const unauthGet = await fetch(`${BASE_URL}/api/dates`);
  assert(unauthGet.status === 401, 'Unauth GET must return 401');

  const unauthPost = await fetch(`${BASE_URL}/api/dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test', date: '2026-06-05', category: 'ANNIVERSARY' }),
  });
  assert(unauthPost.status === 401, 'Unauth POST must return 401');

  const unauthPatch = await fetch(`${BASE_URL}/api/dates/some-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test' }),
  });
  assert(unauthPatch.status === 401, 'Unauth PATCH must return 401');

  const unauthDelete = await fetch(`${BASE_URL}/api/dates/some-id`, { method: 'DELETE' });
  assert(unauthDelete.status === 401, 'Unauth DELETE must return 401');

  console.log('[PASS] All unauthenticated requests rejected with 401.');

  // ----------------------------------------------------
  // Input Validation Tests
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Input Validation ---');

  // Empty title
  const emptyTitle = await fetch(`${BASE_URL}/api/dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ title: '   ', date: '2026-06-05', category: 'ANNIVERSARY' }),
  });
  assert(emptyTitle.status === 400, 'Empty title should return 400');

  // Invalid date
  const invalidDate = await fetch(`${BASE_URL}/api/dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ title: 'Valid Title', date: 'not-a-date', category: 'ANNIVERSARY' }),
  });
  assert(invalidDate.status === 400, 'Invalid date should return 400');

  // Invalid category
  const invalidCat = await fetch(`${BASE_URL}/api/dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ title: 'Valid Title', date: '2026-06-05', category: 'UNKNOWN_CATEGORY' }),
  });
  assert(invalidCat.status === 400, 'Invalid category should return 400');

  console.log('[PASS] Validation correctly rejected empty title, invalid date, and invalid category.');

  // ----------------------------------------------------
  // CRUD & Shared Partner Verification
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Shared Relationship CRUD ---');
  const createdIds: string[] = [];

  try {
    // Puspender creates an anniversary date
    const createRes = await fetch(`${BASE_URL}/api/dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
      body: JSON.stringify({
        title: 'Our Official Anniversary',
        description: 'The day we promised to be together forever.',
        category: 'ANNIVERSARY',
        date: '2025-06-05',
        recursAnnually: true,
      }),
    });
    assert(createRes.status === 201, `Expected 201 on create, got ${createRes.status}`);
    const createData = await createRes.json();
    assert(createData.success === true, 'Expected success === true');
    const anniversaryId = createData.date.id;
    createdIds.push(anniversaryId);
    assert(createData.date.createdById === puspender.user.id, 'createdById must match authenticated user');
    assert(createData.date.createdBy.displayName === 'Puspender', 'createdBy name matches');
    assert(createData.date.recursAnnually === true, 'recursAnnually is true');
    console.log('[PASS] Puspender created shared Important Date');

    // Sonam can view the date in list
    const sonamListRes = await fetch(`${BASE_URL}/api/dates`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(sonamListRes.status === 200, 'Sonam should fetch dates');
    const sonamListData = await sonamListRes.json();
    const foundBySonam = sonamListData.items.find((d: any) => d.id === anniversaryId);
    assert(!!foundBySonam, 'Sonam must see the date created by Puspender');
    assert(foundBySonam.title === 'Our Official Anniversary', 'Title matches for Sonam');
    console.log('[PASS] Sonam can see date in list');

    // Sonam can fetch date directly by ID
    const sonamGetRes = await fetch(`${BASE_URL}/api/dates/${anniversaryId}`, {
      headers: { Cookie: sonam.cookie },
    });
    assert(sonamGetRes.status === 200, 'Sonam GET /api/dates/[id] must return 200');
    const sonamGetData = await sonamGetRes.json();
    assert(sonamGetData.date.title === 'Our Official Anniversary', 'Direct get matches');
    console.log('[PASS] Sonam can fetch date directly by ID');

    // Sonam edits the shared date
    const sonamEditRes = await fetch(`${BASE_URL}/api/dates/${anniversaryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: 'Our Beautiful Anniversary',
        description: 'Updated with all our love.',
      }),
    });
    assert(sonamEditRes.status === 200, 'Sonam should be authorized to edit shared date');
    const sonamEditData = await sonamEditRes.json();
    assert(sonamEditData.date.title === 'Our Beautiful Anniversary', 'Title should be updated');
    assert(sonamEditData.date.createdById === puspender.user.id, 'createdById must remain original creator');
    console.log('[PASS] Sonam successfully edited shared date; creator remains immutable');

    // Puspender sees Sonam's edit
    const puspenderGetRes = await fetch(`${BASE_URL}/api/dates/${anniversaryId}`, {
      headers: { Cookie: puspender.cookie },
    });
    const puspenderGetData = await puspenderGetRes.json();
    assert(puspenderGetData.date.title === 'Our Beautiful Anniversary', 'Puspender sees updated title');
    console.log('[PASS] Puspender sees Sonam\'s edits');

    // ----------------------------------------------------
    // Search & Filters Testing
    // ----------------------------------------------------
    console.log('\n--- 5. Testing PostgreSQL Search & Category Filters ---');

    // Create a 2nd date: Birthday
    const bdayRes = await fetch(`${BASE_URL}/api/dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
      body: JSON.stringify({
        title: "Puspender's Birthday",
        description: 'Celebration time with chocolate cake',
        category: 'BIRTHDAY',
        date: '2000-11-15',
        recursAnnually: true,
      }),
    });
    const bdayData = await bdayRes.json();
    createdIds.push(bdayData.date.id);

    // Search by title
    const searchRes = await fetch(`${BASE_URL}/api/dates?search=Birthday`, {
      headers: { Cookie: puspender.cookie },
    });
    const searchData = await searchRes.json();
    assert(searchData.items.length === 1, `Expected 1 search result, got ${searchData.items.length}`);
    assert(searchData.items[0].id === bdayData.date.id, 'Search matched correct birthday');
    console.log('[PASS] Title search works');

    // Search by description
    const descSearchRes = await fetch(`${BASE_URL}/api/dates?search=chocolate`, {
      headers: { Cookie: puspender.cookie },
    });
    const descSearchData = await descSearchRes.json();
    assert(descSearchData.items.length === 1, 'Search matched description keyword');
    console.log('[PASS] Description search works');

    // Category filter
    const catFilterRes = await fetch(`${BASE_URL}/api/dates?category=ANNIVERSARY`, {
      headers: { Cookie: puspender.cookie },
    });
    const catFilterData = await catFilterRes.json();
    assert(catFilterData.items.every((d: any) => d.category === 'ANNIVERSARY'), 'All filtered items are ANNIVERSARY');
    console.log('[PASS] Category filter works');

    // ----------------------------------------------------
    // Home Dashboard Widget Integration
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Home Dashboard Widget Integration ---');
    const dashboardData = await getDashboardData(puspender.user);
    assert(dashboardData.nearestDate !== null, 'Dashboard nearestDate should not be null');
    if (!dashboardData.nearestDate) throw new Error('nearestDate is null');
    assert(typeof dashboardData.nearestDate.title === 'string', 'Dashboard nearestDate has title');
    assert(typeof dashboardData.nearestDate.date === 'string', 'Dashboard nearestDate has formatted date string');
    console.log(`[PASS] Dashboard nearestDate populated: "${dashboardData.nearestDate.title}" (${dashboardData.nearestDate.date})`);

    // ----------------------------------------------------
    // Deletion
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Deletion ---');
    const deleteRes = await fetch(`${BASE_URL}/api/dates/${anniversaryId}`, {
      method: 'DELETE',
      headers: { Cookie: puspender.cookie },
    });
    assert(deleteRes.status === 200, 'Delete must return 200');

    const verifyDeleted = await fetch(`${BASE_URL}/api/dates/${anniversaryId}`, {
      headers: { Cookie: puspender.cookie },
    });
    assert(verifyDeleted.status === 404, 'Deleted date must return 404');
    console.log('[PASS] Important Date deleted and returns 404');

    // ----------------------------------------------------
    // Phase 1–7 Regressions
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Phase 1–7 Regressions ---');
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

    console.log('\n=== ALL PHASE 8 TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Clean up temporary test dates
    console.log('--- Cleaning Up Test Dates ---');
    if (createdIds.length > 0) {
      await prisma.importantDate.deleteMany({
        where: { id: { in: createdIds } },
      });
      console.log(`Cleaned up ${createdIds.length} test date(s). Production database is clean.`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FAIL] Test encountered an error:', err);
    process.exit(1);
  });
