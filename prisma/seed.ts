import { PrismaClient, Role, ShiftStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DateTime } from 'luxon';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://shiftsync:password@localhost:5433/shiftsync_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.dropRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityWindow.deleteMany();
  await prisma.staffLocationCertification.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.managerLocation.deleteMany();
  await prisma.location.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating Admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@coastaleats.com',
      passwordHash: 'hashed_password', // mock
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  console.log('Creating Locations...');
  const locNY = await prisma.location.create({
    data: {
      name: 'Coastal Eats - Manhattan',
      timezone: 'America/New_York',
      address: '123 Broadway, NY',
    },
  });
  const locBOS = await prisma.location.create({
    data: {
      name: 'Coastal Eats - Boston',
      timezone: 'America/New_York',
      address: '456 Harbor St, MA',
    },
  });
  const locSF = await prisma.location.create({
    data: {
      name: 'Coastal Eats - San Francisco',
      timezone: 'America/Los_Angeles',
      address: '789 Market St, CA',
    },
  });
  const locSEA = await prisma.location.create({
    data: {
      name: 'Coastal Eats - Seattle',
      timezone: 'America/Los_Angeles',
      address: '101 Pike St, WA',
    },
  });

  console.log('Creating Managers...');
  const managerNY = await prisma.user.create({
    data: {
      email: 'manager_ny@coastaleats.com',
      passwordHash: 'hashed_password',
      firstName: 'Alice',
      lastName: 'Manager',
      role: Role.MANAGER,
      managedLocations: {
        create: { locationId: locNY.id },
      },
    },
  });

  const managerSF = await prisma.user.create({
    data: {
      email: 'manager_sf@coastaleats.com',
      passwordHash: 'hashed_password',
      firstName: 'Bob',
      lastName: 'Manager',
      role: Role.MANAGER,
      managedLocations: {
        create: [{ locationId: locSF.id }, { locationId: locSEA.id }],
      },
    },
  });

  console.log('Creating Staff...');
  // Staff 1: Bartender, certified in NY and BOS, morning availability
  const staff1 = await prisma.user.create({
    data: {
      email: 'john_bartender@coastaleats.com',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.STAFF,
      staffProfile: {
        create: {
          desiredHoursPerWeek: 30,
          skills: { create: [{ skill: 'bartender' }] },
          certifications: {
            create: [{ locationId: locNY.id }, { locationId: locBOS.id }],
          },
          availabilityWindows: {
            create: Array.from({ length: 7 }).map((_, i) => ({
              dayOfWeek: i,
              startTime: '08:00',
              endTime: '16:00',
            })),
          },
        },
      },
    },
    include: { staffProfile: true },
  });

  // Staff 2: Line Cook, certified in SF, evening availability (including overnight)
  const staff2 = await prisma.user.create({
    data: {
      email: 'sarah_cook@coastaleats.com',
      passwordHash: 'hashed_password',
      firstName: 'Sarah',
      lastName: 'Smith',
      role: Role.STAFF,
      staffProfile: {
        create: {
          desiredHoursPerWeek: 40,
          skills: { create: [{ skill: 'line_cook' }] },
          certifications: {
            create: [{ locationId: locSF.id }],
          },
          availabilityWindows: {
            create: Array.from({ length: 7 }).map((_, i) => ({
              dayOfWeek: i,
              startTime: '16:00',
              endTime: '04:00',
            })),
          },
        },
      },
    },
    include: { staffProfile: true },
  });

  // Staff 3: Server, cross-timezone certification (SF + NY) for timezone tangle scenario
  const staff3 = await prisma.user.create({
    data: {
      email: 'maria_server@coastaleats.com',
      passwordHash: 'hashed_password',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: Role.STAFF,
      staffProfile: {
        create: {
          desiredHoursPerWeek: 25,
          skills: { create: [{ skill: 'server' }] },
          certifications: {
            create: [{ locationId: locSF.id }, { locationId: locNY.id }],
          },
          availabilityWindows: {
            create: Array.from({ length: 7 }).map((_, i) => ({
              dayOfWeek: i,
              startTime: '09:00',
              endTime: '17:00',
            })),
          },
        },
      },
    },
    include: { staffProfile: true },
  });

  console.log('Creating Shifts...');
  // A published shift in NY
  const shiftNY = await prisma.shift.create({
    data: {
      locationId: locNY.id,
      startAt: DateTime.utc().plus({ days: 1 }).set({ hour: 13 }).toJSDate(), // 9 AM NY time
      endAt: DateTime.utc().plus({ days: 1 }).set({ hour: 19 }).toJSDate(), // 3 PM NY time
      requiredSkill: 'bartender',
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  // Assign staff1
  await prisma.shiftAssignment.create({
    data: {
      shiftId: shiftNY.id,
      staffId: staff1.staffProfile!.id,
    },
  });

  // A draft shift in SF (Overnight)
  const shiftSF = await prisma.shift.create({
    data: {
      locationId: locSF.id,
      startAt: DateTime.utc().plus({ days: 2 }).set({ hour: 3 }).toJSDate(), // 8 PM SF time
      endAt: DateTime.utc().plus({ days: 2 }).set({ hour: 11 }).toJSDate(), // 4 AM SF time next day
      requiredSkill: 'line_cook',
      headcount: 1,
      status: ShiftStatus.DRAFT,
    },
  });

  await prisma.shiftAssignment.create({
    data: {
      shiftId: shiftSF.id,
      staffId: staff2.staffProfile!.id,
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
