import { prisma } from '@/lib/prisma';
import { io as ClientSocket, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3001';

async function login(identifier: string, password: string): Promise<{ cookie: string; user: any; token: string }> {
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

  const tokenMatch = setCookie.match(/our_space_session=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';

  const data = await res.json();
  return { cookie: setCookie, user: data.user, token };
}

function createTestSocket(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ClientSocket(SOCKET_URL, {
      auth: { token },
      extraHeaders: {
        Cookie: `our_space_session=${token}`,
      },
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('=== STARTING PHASE 5: PRIVATE CHAT INTEGRATION & SECURITY TESTS ===\n');

  // 1. Initial State & Regressions Check
  console.log('--- 1. Initial Database State & Regressions ---');
  const userCount = await prisma.user.count();
  const settingsCount = await prisma.relationshipSettings.count();
  if (userCount !== 2) throw new Error('Expected exactly 2 users in DB');
  if (settingsCount !== 1) throw new Error('Expected relationship settings singleton');

  // Ensure clean starting slate for chat test
  await prisma.messageReaction.deleteMany({});
  await prisma.chatMessage.deleteMany({});

  const puspender = await login('puspender', 'sonam');
  const sonam = await login('sonam', 'puspender');
  console.log(`[PASS] Puspender authenticated (ID: ${puspender.user.id})`);
  console.log(`[PASS] Sonam authenticated (ID: ${sonam.user.id})`);

  // Phase 1 Auth Regression
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: puspender.cookie } });
  const meData = await meRes.json();
  if (meData.user.identifier !== 'puspender') throw new Error('Phase 1 Auth regression');
  console.log('[PASS] Phase 1 Auth regression check passed');

  // Phase 3 Relationship Settings Regression
  const relRes = await fetch(`${BASE_URL}/api/settings/relationship`, { headers: { Cookie: puspender.cookie } });
  if (!relRes.ok) throw new Error('Phase 3 Relationship regression');
  console.log('[PASS] Phase 3 Relationship settings regression check passed');

  // Phase 4 Notes Regression
  const notesRes = await fetch(`${BASE_URL}/api/notes`, { headers: { Cookie: puspender.cookie } });
  if (!notesRes.ok) throw new Error('Phase 4 Notes regression');
  console.log('[PASS] Phase 4 Notes regression check passed');

  // 2. Unauthenticated Protections
  console.log('\n--- 2. Unauthenticated API & Socket Protections ---');
  const unauthGet = await fetch(`${BASE_URL}/api/chat/messages`);
  if (unauthGet.status !== 401) throw new Error(`Expected 401 for unauth GET, got ${unauthGet.status}`);

  const unauthPost = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'malicious' }),
  });
  if (unauthPost.status !== 401) throw new Error(`Expected 401 for unauth POST, got ${unauthPost.status}`);

  // Unauthenticated Socket connection attempt
  let socketRejected = false;
  try {
    await createTestSocket('invalid-token-12345');
  } catch (err: any) {
    socketRejected = true;
    console.log(`[PASS] Invalid socket connection rejected with error: "${err.message}"`);
  }
  if (!socketRejected) {
    throw new Error('Socket.IO allowed an unauthenticated connection!');
  }

  // 3. Socket Authentication & Private Room Connection
  console.log('\n--- 3. Socket Authentication & Room Connection ---');
  const socketPuspender = await createTestSocket(puspender.token);
  const socketSonam = await createTestSocket(sonam.token);
  console.log(`[PASS] Puspender connected to Socket.IO (Socket ID: ${socketPuspender.id})`);
  console.log(`[PASS] Sonam connected to Socket.IO (Socket ID: ${socketSonam.id})`);

  // 4. Message Validation
  console.log('\n--- 4. Message Input Validation ---');
  const emptyRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ content: '   ' }),
  });
  if (emptyRes.status !== 400) throw new Error('Empty message was not rejected with 400');

  const oversizedRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ content: 'a'.repeat(5001) }),
  });
  if (oversizedRes.status !== 400) throw new Error('Oversized message was not rejected with 400');
  console.log('[PASS] Empty and oversized messages correctly rejected with 400');

  // 5. Send Message & Real-time Delivery via Socket.IO
  console.log('\n--- 5. Send Message & Real-Time Delivery ---');
  let sonamReceivedMessage: any = null;
  socketSonam.on('message:new', (msg) => {
    sonamReceivedMessage = msg;
  });

  const sendMsgPromise = new Promise<any>((resolve, reject) => {
    socketPuspender.emit(
      'message:send',
      { content: 'Hello Sonam, this is our private space!' },
      (res: any) => {
        if (res.error) reject(new Error(res.error));
        else resolve(res.message);
      }
    );
  });

  const sentMessage = await sendMsgPromise;
  console.log(`[PASS] Message created via Socket.IO, ID: ${sentMessage.id}`);

  // Wait briefly for socket broadcast to reach Sonam
  await new Promise((r) => setTimeout(r, 200));

  if (!sonamReceivedMessage || sonamReceivedMessage.id !== sentMessage.id) {
    throw new Error('Sonam did not receive the real-time message event');
  }
  console.log('[PASS] Sonam received message event in real-time');

  // Verify persistence in PostgreSQL
  const dbMsg = await prisma.chatMessage.findUnique({
    where: { id: sentMessage.id },
  });
  if (!dbMsg || dbMsg.content !== 'Hello Sonam, this is our private space!') {
    throw new Error('Message was not correctly persisted in PostgreSQL');
  }
  if (dbMsg.senderId !== puspender.user.id) {
    throw new Error('Message senderId does not match authenticated Puspender');
  }
  console.log('[PASS] Message persistence confirmed in PostgreSQL with correct senderId');

  // 6. Read Receipts & Unread Count
  console.log('\n--- 6. Read Receipts & Unread Count ---');
  // Check Sonam unread count
  const unreadSonamRes = await fetch(`${BASE_URL}/api/chat/unread`, {
    headers: { Cookie: sonam.cookie },
  });
  const unreadSonam = await unreadSonamRes.json();
  if (unreadSonam.count !== 1) throw new Error(`Expected 1 unread message for Sonam, got ${unreadSonam.count}`);
  console.log('[PASS] Unread count for Sonam is 1');

  // Check Puspender unread count (sender should have 0 unread)
  const unreadPuspenderRes = await fetch(`${BASE_URL}/api/chat/unread`, {
    headers: { Cookie: puspender.cookie },
  });
  const unreadPuspender = await unreadPuspenderRes.json();
  if (unreadPuspender.count !== 0) throw new Error(`Expected 0 unread for sender Puspender, got ${unreadPuspender.count}`);
  console.log('[PASS] Unread count for sender Puspender is 0');

  // Sonam marks message as read
  let puspenderReceivedReadReceipt: any = null;
  socketPuspender.on('message:read_receipt', (data) => {
    puspenderReceivedReadReceipt = data;
  });

  const readRes = await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}/read`, {
    method: 'POST',
    headers: { Cookie: sonam.cookie },
  });
  if (!readRes.ok) throw new Error('Failed to mark message read');

  // Verify in PostgreSQL that readAt was set
  const dbReadMsg = await prisma.chatMessage.findUnique({
    where: { id: sentMessage.id },
  });
  if (!dbReadMsg || !dbReadMsg.readAt) {
    throw new Error('readAt was not set in PostgreSQL');
  }
  console.log(`[PASS] readAt timestamp recorded in PostgreSQL: ${dbReadMsg.readAt.toISOString()}`);

  // Re-check Sonam unread count
  const unreadSonamAfter = await (await fetch(`${BASE_URL}/api/chat/unread`, { headers: { Cookie: sonam.cookie } })).json();
  if (unreadSonamAfter.count !== 0) throw new Error('Unread count should be 0 after reading');
  console.log('[PASS] Sonam unread count decreased to 0 after reading');

  // 7. Message Replies
  console.log('\n--- 7. Message Replies ---');
  const replyRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
    body: JSON.stringify({
      content: 'I love our private space too!',
      replyToId: sentMessage.id,
    }),
  });
  if (!replyRes.ok) throw new Error(`Failed to send reply: ${await replyRes.text()}`);
  const replyMsg = (await replyRes.json()).message;
  if (!replyMsg.replyTo || replyMsg.replyTo.id !== sentMessage.id) {
    throw new Error('Reply does not reference the original message');
  }
  console.log(`[PASS] Reply sent successfully, referencing message ${sentMessage.id}`);

  // Invalid replyToId rejected
  const invalidReplyRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
    body: JSON.stringify({
      content: 'Bad reply',
      replyToId: 'non-existent-msg-id-999',
    }),
  });
  if (invalidReplyRes.status !== 404 && invalidReplyRes.status !== 400) {
    throw new Error(`Expected error for invalid replyToId, got ${invalidReplyRes.status}`);
  }
  console.log('[PASS] Invalid replyToId was correctly rejected');

  // 8. Reactions & Duplicate Prevention
  console.log('\n--- 8. Message Reactions ---');
  // Sonam reacts with HEART
  const react1 = await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
    body: JSON.stringify({ reaction: 'HEART' }),
  });
  if (!react1.ok) throw new Error('Failed to add reaction');
  const rData1 = (await react1.json()).message;
  const heartReaction = rData1.reactions.find((r: any) => r.reaction === 'HEART');
  if (!heartReaction || heartReaction.count !== 1) {
    throw new Error('Expected 1 HEART reaction');
  }
  console.log('[PASS] Sonam reacted with HEART (count = 1)');

  // Sonam toggles HEART reaction (removes it)
  const reactToggle = await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
    body: JSON.stringify({ reaction: 'HEART' }),
  });
  const rDataToggle = (await reactToggle.json()).message;
  if (rDataToggle.reactions.some((r: any) => r.reaction === 'HEART')) {
    throw new Error('Toggling reaction should remove it');
  }
  console.log('[PASS] Toggling reaction removed it cleanly');

  // Both partners react with THUMBS_UP
  await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sonam.cookie },
    body: JSON.stringify({ reaction: 'THUMBS_UP' }),
  });
  await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: puspender.cookie },
    body: JSON.stringify({ reaction: 'THUMBS_UP' }),
  });
  const multiReactMsg = await prisma.chatMessage.findUnique({
    where: { id: sentMessage.id },
    include: { reactions: true },
  });
  if (multiReactMsg?.reactions.length !== 2) {
    throw new Error(`Expected 2 reactions, got ${multiReactMsg?.reactions.length}`);
  }
  console.log('[PASS] Both partners reacted with THUMBS_UP (persisted in PostgreSQL)');

  // 9. Typing Indicators (Ephemeral)
  console.log('\n--- 9. Typing Indicators (Ephemeral) ---');
  let sonamSawTyping = false;
  socketSonam.on('typing:start', (data) => {
    if (data.userId === puspender.user.id) sonamSawTyping = true;
  });

  socketPuspender.emit('typing:start');
  await new Promise((r) => setTimeout(r, 150));
  if (!sonamSawTyping) throw new Error('Sonam did not receive typing:start event');
  console.log('[PASS] Ephemeral typing event transmitted to partner');

  // 10. Search Server-Side
  console.log('\n--- 10. Message Search ---');
  const searchRes = await fetch(`${BASE_URL}/api/chat/search?q=private+space`, {
    headers: { Cookie: sonam.cookie },
  });
  const searchData = await searchRes.json();
  if (!searchData.messages.some((m: any) => m.id === sentMessage.id)) {
    throw new Error('Search failed to find message with query "private space"');
  }
  console.log('[PASS] Server-side message search located the message');

  // 11. Own-Message Deletion & Security
  console.log('\n--- 11. Soft Deletion & Ownership Security ---');
  // Sonam attempts to delete Puspender's message -> Must be 403 Forbidden
  const forbiddenDel = await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}`, {
    method: 'DELETE',
    headers: { Cookie: sonam.cookie },
  });
  if (forbiddenDel.status !== 403) {
    throw new Error(`Expected 403 when partner deletes owner message, got ${forbiddenDel.status}`);
  }
  console.log('[PASS] Partner deletion attempt correctly rejected with 403 Forbidden');

  // Puspender deletes own message
  const ownerDel = await fetch(`${BASE_URL}/api/chat/messages/${sentMessage.id}`, {
    method: 'DELETE',
    headers: { Cookie: puspender.cookie },
  });
  if (!ownerDel.ok) throw new Error('Owner failed to delete message');
  const deletedMsgData = (await ownerDel.json()).message;
  if (!deletedMsgData.isDeleted || deletedMsgData.content !== 'This message was deleted.') {
    throw new Error('Deleted message was not redacted properly');
  }

  // Verify in PostgreSQL
  const dbDelMsg = await prisma.chatMessage.findUnique({
    where: { id: sentMessage.id },
  });
  if (!dbDelMsg?.deletedAt) throw new Error('deletedAt was not set in PostgreSQL');
  console.log('[PASS] Message soft-deleted with deletedAt set and content redacted');

  // 12. Cleanup of Test Messages & Record Verification
  console.log('\n--- 12. Database Cleanup & Final Verification ---');
  socketPuspender.disconnect();
  socketSonam.disconnect();

  await prisma.messageReaction.deleteMany({});
  await prisma.chatMessage.deleteMany({});

  const finalMessages = await prisma.chatMessage.count();
  const finalReactions = await prisma.messageReaction.count();
  const finalUsers = await prisma.user.count();
  const finalSettings = await prisma.relationshipSettings.count();

  console.log(`Final Database counts: Messages=${finalMessages}, Reactions=${finalReactions}, Users=${finalUsers}, Settings=${finalSettings}`);

  if (finalMessages !== 0 || finalReactions !== 0) {
    throw new Error('Test chat messages and reactions were not cleaned up');
  }
  if (finalUsers !== 2 || finalSettings !== 1) {
    throw new Error('Users or settings were modified unexpectedly');
  }

  console.log('\n==================================================');
  console.log('ALL PHASE 5 CHAT INTEGRATION TESTS PASSED!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('\nTEST RUN FAILED:', err);
  process.exit(1);
});
