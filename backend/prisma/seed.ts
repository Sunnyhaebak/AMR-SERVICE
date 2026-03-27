import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@amr.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@amr.com',
      passwordHash,
      roles: [Role.ADMIN],
      defaultLandingPage: '/admin/users',
    },
  });

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@amr.com' },
    update: {},
    create: {
      name: 'Service Manager',
      email: 'manager@amr.com',
      passwordHash,
      roles: [Role.MANAGER],
      defaultLandingPage: '/manager/attendance',
    },
  });

  // Create Engineers
  const engineer1 = await prisma.user.upsert({
    where: { email: 'engineer1@amr.com' },
    update: {},
    create: {
      name: 'Engineer One',
      email: 'engineer1@amr.com',
      passwordHash,
      roles: [Role.ENGINEER],
      managerId: manager.id,
      defaultLandingPage: '/engineer/tickets',
    },
  });

  const engineer2 = await prisma.user.upsert({
    where: { email: 'engineer2@amr.com' },
    update: {},
    create: {
      name: 'Engineer Two',
      email: 'engineer2@amr.com',
      passwordHash,
      roles: [Role.ENGINEER],
      managerId: manager.id,
      defaultLandingPage: '/engineer/tickets',
    },
  });

  // Create a Site
  const site = await prisma.site.create({
    data: {
      name: 'Warehouse Alpha',
      customerName: 'Acme Corp',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 500,
    },
  });

  // Create a Bot
  await prisma.bot.create({
    data: {
      botNumber: 'AMR-001',
      siteId: site.id,
      model: 'AMR-X100',
      isActive: true,
    },
  });

  // System config
  await prisma.systemConfig.upsert({
    where: { key: 'TICKET_BASE_NUMBER' },
    update: {},
    create: { key: 'TICKET_BASE_NUMBER', value: '49000' },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'STANDARD_SHIFT_START' },
    update: {},
    create: { key: 'STANDARD_SHIFT_START', value: '09:00' },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'STANDARD_SHIFT_END' },
    update: {},
    create: { key: 'STANDARD_SHIFT_END', value: '18:00' },
  });

  console.log('Seed data created:', {
    admin: admin.email,
    manager: manager.email,
    engineers: [engineer1.email, engineer2.email],
    site: site.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
