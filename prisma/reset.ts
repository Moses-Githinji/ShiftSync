import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://shiftsync:password@localhost:5433/shiftsync_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reset() {
  console.log('Resetting database...');
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.dropRequest.deleteMany();
  await prisma.staffLocationCertification.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.managerLocation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  console.log('Database reset successfully!');
}

reset()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
