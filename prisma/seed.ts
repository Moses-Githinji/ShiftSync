import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

const connectionString = process.env.DATABASE_URL || 'postgresql://shiftsync:password@localhost:5433/shiftsync_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Location
  const location = await prisma.location.create({
    data: {
      name: 'Coastal Eats - Downtown',
      timezone: 'America/New_York',
      address: '123 Main St',
    }
  });

  // 2. Create Users & Staff Profiles
  const passwordHash = await bcrypt.hash('password', 10);
  
  const user1 = await prisma.user.create({
    data: {
      email: 'john@coastaleats.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          certifications: {
            create: { locationId: location.id }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'sarah@coastaleats.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Smith',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          certifications: {
            create: { locationId: location.id }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'mike@coastaleats.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 20, // Part time
          certifications: {
            create: { locationId: location.id }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  // 3. Create Shifts for next week
  const nextMonday = DateTime.now().setZone('America/New_York').startOf('week').plus({ weeks: 1 });
  
  // Shift 1: John on Monday
  await prisma.shift.create({
    data: {
      locationId: location.id,
      startAt: nextMonday.set({ hour: 9 }).toJSDate(),
      endAt: nextMonday.set({ hour: 17 }).toJSDate(),
      requiredSkill: 'Bartender',
      assignments: {
        create: { staffId: user1.staffProfile!.id }
      }
    }
  });

  // Shift 2: Sarah on Tuesday
  const nextTuesday = nextMonday.plus({ days: 1 });
  await prisma.shift.create({
    data: {
      locationId: location.id,
      startAt: nextTuesday.set({ hour: 10 }).toJSDate(),
      endAt: nextTuesday.set({ hour: 18 }).toJSDate(),
      requiredSkill: 'Server',
      assignments: {
        create: { staffId: user2.staffProfile!.id }
      }
    }
  });

  // Shift 3: Unassigned Wednesday
  const nextWednesday = nextMonday.plus({ days: 2 });
  await prisma.shift.create({
    data: {
      locationId: location.id,
      startAt: nextWednesday.set({ hour: 17 }).toJSDate(),
      endAt: nextWednesday.set({ hour: 23 }).toJSDate(),
      requiredSkill: 'Line Cook',
    }
  });

  // Shift 4: Unassigned Friday
  const nextFriday = nextMonday.plus({ days: 4 });
  await prisma.shift.create({
    data: {
      locationId: location.id,
      startAt: nextFriday.set({ hour: 16 }).toJSDate(),
      endAt: nextFriday.plus({ days: 1 }).set({ hour: 0 }).toJSDate(),
      requiredSkill: 'Bartender',
    }
  });

  console.log(`Database seeded! Location ID to use: ${location.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
