import { prisma } from '../src/lib/prisma';
import {
  sendMessage,
  getChatHistory,
  deleteMessage,
  formatMessage,
} from '../src/lib/chat/chat.service';

async function runTests() {
  console.log('--- Starting Chat Reply & Mobile UX Persistence Tests ---');

  // 1. Fetch our two users
  const puspender = await prisma.user.findUnique({ where: { identifier: 'puspender' } });
  const sonam = await prisma.user.findUnique({ where: { identifier: 'sonam' } });

  if (!puspender || !sonam) {
    throw new Error('Both users (puspender, sonam) must exist in database.');
  }

  console.log(`✓ Users verified: Puspender (${puspender.id}), Sonam (${sonam.id})`);

  let parentMsgId: string | null = null;
  let replyMsgId: string | null = null;

  try {
    // 2. Send parent message from Sonam
    console.log('\nStep 1: Sending parent message from Sonam...');
    const parent = await sendMessage(sonam.id, {
      content: 'Are you free this evening for a walk? 🌸',
    });
    parentMsgId = parent.id;
    console.log(`✓ Parent message created: ID=${parent.id}, sender=${parent.senderName}, content="${parent.content}"`);

    // 3. Send reply message from Puspender referencing Sonam's message
    console.log('\nStep 2: Sending reply message from Puspender referencing parent message...');
    const reply = await sendMessage(puspender.id, {
      content: 'Yes! Let us go to our favorite garden at 6 PM ❤️',
      replyToId: parent.id,
    });
    replyMsgId = reply.id;
    console.log(`✓ Reply message created: ID=${reply.id}, replyToId=${reply.replyTo?.id}`);
    console.log('✓ Reply payload structure:');
    console.log(JSON.stringify(reply.replyTo, null, 2));

    if (!reply.replyTo) {
      throw new Error('Expected replyTo to be populated in created message response');
    }
    if (reply.replyTo.id !== parent.id) {
      throw new Error(`Expected replyTo.id to equal ${parent.id}, got ${reply.replyTo.id}`);
    }
    if (reply.replyTo.senderName !== sonam.displayName) {
      throw new Error(`Expected replyTo.senderName to equal ${sonam.displayName}, got ${reply.replyTo.senderName}`);
    }
    if (reply.replyTo.isDeleted !== false) {
      throw new Error('Expected replyTo.isDeleted to be false');
    }

    // 4. Verify PostgreSQL persistence directly in database
    console.log('\nStep 3: Verifying direct database persistence in PostgreSQL...');
    const dbRecord = await prisma.chatMessage.findUnique({
      where: { id: reply.id },
      include: {
        replyTo: {
          include: { sender: true },
        },
      },
    });

    if (!dbRecord || dbRecord.replyToId !== parent.id) {
      throw new Error('PostgreSQL record does not have correct replyToId');
    }
    console.log(`✓ PostgreSQL ChatMessage row has foreign key replyToId: ${dbRecord.replyToId}`);

    // 5. Verify chat history retrieval for both users
    console.log('\nStep 4: Verifying getChatHistory for both partners...');
    const sonamHistory = await getChatHistory(sonam.id, { limit: 10 });
    const sonamViewOfReply = sonamHistory.messages.find((m) => m.id === reply.id);
    if (!sonamViewOfReply || !sonamViewOfReply.replyTo) {
      throw new Error('Sonam chat history did not include populated replyTo');
    }
    console.log(`✓ Sonam retrieved reply correctly: quotes "${sonamViewOfReply.replyTo.content}" from ${sonamViewOfReply.replyTo.senderName}`);

    const puspenderHistory = await getChatHistory(puspender.id, { limit: 10 });
    const puspenderViewOfReply = puspenderHistory.messages.find((m) => m.id === reply.id);
    if (!puspenderViewOfReply || !puspenderViewOfReply.replyTo) {
      throw new Error('Puspender chat history did not include populated replyTo');
    }
    console.log(`✓ Puspender retrieved reply correctly: quotes "${puspenderViewOfReply.replyTo.content}" from ${puspenderViewOfReply.replyTo.senderName}`);

    // 6. Test soft deletion of parent message and fallback behavior
    console.log('\nStep 5: Testing soft deletion of parent message...');
    await deleteMessage(sonam.id, parent.id);

    const historyAfterDelete = await getChatHistory(puspender.id, { limit: 10 });
    const replyAfterParentDeleted = historyAfterDelete.messages.find((m) => m.id === reply.id);

    if (!replyAfterParentDeleted || !replyAfterParentDeleted.replyTo) {
      throw new Error('Expected reply message to still retain replyTo metadata after parent deletion');
    }
    console.log('✓ Reply after parent deleted:');
    console.log(JSON.stringify(replyAfterParentDeleted.replyTo, null, 2));

    if (replyAfterParentDeleted.replyTo.isDeleted !== true) {
      throw new Error('Expected replyTo.isDeleted to be true after parent message was soft-deleted');
    }
    if (replyAfterParentDeleted.replyTo.content !== 'This message was deleted') {
      throw new Error(`Expected fallback content "This message was deleted", got "${replyAfterParentDeleted.replyTo.content}"`);
    }
    console.log('✓ Graceful fallback verified when parent message is deleted.');

    // 7. Test unlinked / missing parent fallback
    console.log('\nStep 6: Testing missing parent fallback in formatMessage...');
    const mockPrismaMessage: any = {
      id: 'test-fake-reply',
      senderId: puspender.id,
      sender: { id: puspender.id, displayName: puspender.displayName, avatarUrl: null },
      content: 'Testing fallback',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      readAt: null,
      replyToId: 'non-existent-parent-id',
      replyTo: null,
      reactions: [],
    };
    const formattedFallback = formatMessage(mockPrismaMessage, puspender.id);
    console.log('✓ Fallback when parent is completely missing:');
    console.log(JSON.stringify(formattedFallback.replyTo, null, 2));
    if (formattedFallback.replyTo?.content !== 'Original message unavailable') {
      throw new Error('Expected fallback content "Original message unavailable"');
    }

    console.log('\n✓ ALL CHAT REPLY & PERSISTENCE TESTS PASSED SUCCESSFULLY!');
  } finally {
    // 8. Clean up created test messages to preserve ZERO MOCK DATA rule
    console.log('\nStep 7: Cleaning up test messages...');
    if (replyMsgId) {
      await prisma.chatMessage.deleteMany({ where: { id: replyMsgId } });
    }
    if (parentMsgId) {
      await prisma.chatMessage.deleteMany({ where: { id: parentMsgId } });
    }
    console.log('✓ Cleaned up test messages. 0 mock/test records remaining in PostgreSQL.');
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
