import { prisma } from '@/lib/prisma';

async function main() {
  const [
    users,
    sessions,
    relationshipSettings,
    notes,
    chatMessages,
    voiceMemories,
    openWhenLetters,
    importantDates,
    bucketItems,
    moodEntries,
    timelineEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.relationshipSettings.count(),
    prisma.note.count(),
    prisma.chatMessage.count(),
    prisma.voiceMemory.count(),
    prisma.openWhenLetter.count(),
    prisma.importantDate.count(),
    prisma.bucketItem.count(),
    prisma.moodEntry.count(),
    prisma.timelineEvent.count(),
  ]);

  console.log(JSON.stringify({
    Users: users,
    Sessions: sessions,
    RelationshipSettings: relationshipSettings,
    Notes: notes,
    ChatMessages: chatMessages,
    VoiceMemories: voiceMemories,
    OpenWhenLetters: openWhenLetters,
    ImportantDates: importantDates,
    BucketItems: bucketItems,
    MoodEntries: moodEntries,
    TimelineEvents: timelineEvents,
  }, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
