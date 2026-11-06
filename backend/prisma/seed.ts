import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING AND SEEDING CITY PHARMA LIMS DATABASE ---');

  // 1. Clean all existing tables in proper relational dependency order
  console.log('Cleaning all operational records...');
  await prisma.auditLog.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.sampleSubmission.deleteMany();
  await prisma.certificateOfAnalysis.deleteMany();
  await prisma.oosIncident.deleteMany();
  await prisma.sampleTest.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.calibrationLog.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.testSpecification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.laboratory.deleteMany();
  console.log('✓ All previous database records purged successfully.');

  // 2. Seed the 3 Essential Analytical Laboratories (Required for Sample Accession Routing)
  console.log('Configuring the 3 Analytical Laboratories...');
  const generalLab = await prisma.laboratory.create({
    data: {
      name: 'General Lab',
      code: 'GL',
      isActive: true,
    },
  });

  const cephLab = await prisma.laboratory.create({
    data: {
      name: 'Cephalosporin Lab',
      code: 'CEPH',
      isActive: true,
    },
  });

  const penLab = await prisma.laboratory.create({
    data: {
      name: 'Penicillin Lab',
      code: 'PEN',
      isActive: true,
    },
  });
  console.log('✓ Configured 3 Laboratories:', generalLab.name, cephLab.name, penLab.name);

  // 3. Seed ONLY the 2 Requested Users: Admin and Analyst
  console.log('Creating EXACTLY TWO users (Admin & Analyst)...');
  const salt = await bcrypt.genSalt(10);
  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 3a. Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@citypharma.com',
      username: 'admin',
      passwordHash,
      fullName: 'Zohaib Zeeshan (Administrator)',
      employeeId: 'EMP-001',
      department: 'QC & Administration',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('✓ Created Admin User:', admin.username, `(${admin.email})`);

  // 3b. Analyst User
  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@citypharma.com',
      username: 'analyst',
      passwordHash,
      fullName: 'Muhammad Ali (QC Analyst)',
      employeeId: 'EMP-ANL-01',
      department: 'Quality Control Laboratory',
      role: Role.ANALYST,
      isActive: true,
    },
  });
  console.log('✓ Created Analyst User:', analyst.username, `(${analyst.email})`);

  console.log('----------------------------------------------------');
  console.log('DATABASE RESET & SEED COMPLETE');
  console.log('Active Users in DB:');
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, fullName: true, role: true, department: true },
  });
  console.table(users);
  console.log('All samples, batches, tests, and audit trails reset to 0.');
  console.log('Ready for manual testing and data entry!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
