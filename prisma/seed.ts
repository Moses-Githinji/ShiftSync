import 'dotenv/config';
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

  // Clean existing seed data for idempotency (child tables first)
  await prisma.dropRequest.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availabilityWindow.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.staffLocationCertification.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.managerLocation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.skill.deleteMany();

  // 1. Create Locations (4 locations across 2 time zones)
  const loc1 = await prisma.location.create({
    data: { name: 'Coastal Eats - Downtown (NY)', timezone: 'America/New_York', address: '123 Main St, New York' }
  });
  const loc2 = await prisma.location.create({
    data: { name: 'Coastal Eats - Uptown (NY)', timezone: 'America/New_York', address: '456 Broadway, New York' }
  });
  const loc3 = await prisma.location.create({
    data: { name: 'Coastal Eats - Beachside (LA)', timezone: 'America/Los_Angeles', address: '789 Ocean Ave, Los Angeles' }
  });
  const loc4 = await prisma.location.create({
    data: { name: 'Coastal Eats - Valley (LA)', timezone: 'America/Los_Angeles', address: '101 Ventura Blvd, Los Angeles' }
  });

  const location = loc1; // Use loc1 as the default for the rest of the seed data

  // 2. Create Users & Staff Profiles
  const passwordHash = await bcrypt.hash('password', 10);
  
  // ADMIN
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@coastaleats.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    }
  });

  // MANAGER
  const managerUser = await prisma.user.create({
    data: {
      email: 'manager_sf@coastaleats.com',
      passwordHash,
      firstName: 'Manager',
      lastName: 'SF',
      role: 'MANAGER',
      managedLocations: {
        create: [
          { locationId: loc3.id },
          { locationId: loc4.id }
        ]
      }
    }
  });

  const managerUserNY = await prisma.user.create({
    data: {
      email: 'manager_ny@coastaleats.com',
      passwordHash,
      firstName: 'Manager',
      lastName: 'NY',
      role: 'MANAGER',
      managedLocations: {
        create: [
          { locationId: loc1.id },
          { locationId: loc2.id }
        ]
      }
    }
  });
  
  // STAFF
  const user1 = await prisma.user.create({
    data: {
      email: 'john_bartender@coastaleats.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Bartender',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          certifications: {
            create: { locationId: location.id }
          },
          skills: {
            create: { skill: 'Bartender' }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'sarah_cook@coastaleats.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Cook',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          certifications: {
            create: { locationId: location.id }
          },
          skills: {
            create: { skill: 'Line Cook' }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'maria_server@coastaleats.com',
      passwordHash,
      firstName: 'Maria',
      lastName: 'Server',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 20, // Part time
          certifications: {
            create: { locationId: location.id }
          },
          skills: {
            create: { skill: 'Server' }
          }
        }
      }
    },
    include: { staffProfile: true }
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'alex_la@coastaleats.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'LA',
      role: 'STAFF',
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          certifications: {
            create: { locationId: loc3.id }
          },
          skills: {
            create: { skill: 'Bartender' }
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

  // Shift 5: LA Shift
  await prisma.shift.create({
    data: {
      locationId: loc3.id,
      startAt: nextMonday.set({ hour: 10 }).toJSDate(),
      endAt: nextMonday.set({ hour: 18 }).toJSDate(),
      requiredSkill: 'Bartender',
      assignments: {
        create: { staffId: user4.staffProfile!.id }
      }
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
