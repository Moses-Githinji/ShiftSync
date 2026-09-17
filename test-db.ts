import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  console.log('Testing DB connection...');
  const connectionString = 'postgresql://shiftsync:shiftsync@localhost:5433/shiftsync_dev?schema=public';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findFirst();
    console.log('Success! Found user:', user?.email);
  } catch (e) {
    console.error('Error connecting to DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
