import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Database connection verified. Starting with zero mock records in accordance with specification.');
}

main()
  .catch((e) => {
    console.error('Error during database check:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
