import { prisma } from '../src/lib/prisma';
import { createSession } from '../src/lib/auth/session';

async function verifyE2E() {
  console.log('--- Verifying E2E Chat, Viewport & Reply API Endpoints ---');

  const puspender = await prisma.user.findUnique({ where: { identifier: 'puspender' } });
  const sonam = await prisma.user.findUnique({ where: { identifier: 'sonam' } });

  if (!puspender || !sonam) throw new Error('Users not found');

  const { token: puspenderToken } = await createSession(puspender.id);
  const cookieHeader = `our_space_session=${puspenderToken}`;

  // 1. Test /chat HTML output for viewport and layout classes
  console.log('1. Checking /chat HTML page...');
  const pageRes = await fetch('http://localhost:3000/chat', {
    headers: { Cookie: cookieHeader },
  });
  console.log(`✓ /chat status: ${pageRes.status}`);
  if (pageRes.status !== 200) {
    throw new Error(`/chat returned status ${pageRes.status}`);
  }
  const html = await pageRes.text();

  if (!html.includes('interactive-widget=resizes-content')) {
    throw new Error('Missing interactive-widget=resizes-content in viewport meta tag');
  }
  console.log('✓ Viewport meta tag includes interactive-widget=resizes-content');

  if (!html.includes('chat-bottom-nav')) {
    throw new Error('Missing chat-bottom-nav class on mobile bottom navigation');
  }
  console.log('✓ Bottom navigation contains chat-bottom-nav class for dynamic keyboard displacement');

  // 2. Test REST POST /api/chat/messages with replyToId
  console.log('2. Sending message via POST /api/chat/messages...');
  const msg1Res = await fetch('http://localhost:3000/api/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ content: 'E2E test message 1' }),
  });
  if (!msg1Res.ok) {
    const err = await msg1Res.text();
    throw new Error(`Failed to send message 1: ${err}`);
  }
  const msg1Data = await msg1Res.json();
  const parentId = msg1Data.message.id;
  console.log(`✓ Message 1 created with ID: ${parentId}`);

  // Send reply via REST
  console.log('3. Sending reply via POST /api/chat/messages with replyToId...');
  const msg2Res = await fetch('http://localhost:3000/api/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      content: 'E2E test reply to message 1',
      replyToId: parentId,
    }),
  });
  if (!msg2Res.ok) {
    const err = await msg2Res.text();
    throw new Error(`Failed to send reply: ${err}`);
  }
  const msg2Data = await msg2Res.json();
  const replyId = msg2Data.message.id;
  console.log(`✓ Reply created with ID: ${replyId}`);
  console.log(`✓ Reply has replyTo: ${JSON.stringify(msg2Data.message.replyTo)}`);

  if (!msg2Data.message.replyTo || msg2Data.message.replyTo.id !== parentId) {
    throw new Error('Reply message does not have matching replyTo.id');
  }

  // 4. Retrieve history and verify reply is present
  console.log('4. Fetching GET /api/chat/messages...');
  const historyRes = await fetch('http://localhost:3000/api/chat/messages?limit=10', {
    headers: { Cookie: cookieHeader },
  });
  const historyData = await historyRes.json();
  const foundReply = historyData.messages.find((m: any) => m.id === replyId);
  if (!foundReply || !foundReply.replyTo) {
    throw new Error('Reply not found or missing replyTo in history response');
  }
  console.log(`✓ History returned reply correctly quoting: "${foundReply.replyTo.content}"`);

  // 5. Cleanup test messages
  console.log('5. Cleaning up test messages...');
  await prisma.chatMessage.deleteMany({
    where: { id: { in: [parentId, replyId] } },
  });
  console.log('✓ Cleaned up test messages. 0 mock/test records remaining.');

  console.log('\n✓ ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

verifyE2E().catch((err) => {
  console.error('E2E verification error:', err);
  process.exit(1);
});
