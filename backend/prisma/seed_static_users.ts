import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const STATIC_ANALYSTS = [
  {
    username: 'analyst1',
    email: 'analyst1@citypharma.com',
    fullName: 'Muhammad Zubair',
    employeeId: 'EMP-ANL-01',
    department: 'General QC Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst2',
    email: 'analyst2@citypharma.com',
    fullName: 'Bilal Raza',
    employeeId: 'EMP-ANL-02',
    department: 'General QC Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst3',
    email: 'analyst3@citypharma.com',
    fullName: 'Usman Tariq',
    employeeId: 'EMP-ANL-03',
    department: 'Finished Formulation Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst4',
    email: 'analyst4@citypharma.com',
    fullName: 'Hamza Farooq',
    employeeId: 'EMP-ANL-04',
    department: 'Semi-Basics / Raw Material Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst5',
    email: 'analyst5@citypharma.com',
    fullName: 'Ayesha Khan',
    employeeId: 'EMP-ANL-05',
    department: 'Penicillin QC Testing Suite',
    assignedLab: 'PENICILLIN',
  },
  {
    username: 'analyst6',
    email: 'analyst6@citypharma.com',
    fullName: 'Fatima Noor',
    employeeId: 'EMP-ANL-06',
    department: 'Cephalosporin Sterile Suite',
    assignedLab: 'CEPHALOSPORIN',
  },
  {
    username: 'analyst7',
    email: 'analyst7@citypharma.com',
    fullName: 'Salman Ahmed',
    employeeId: 'EMP-ANL-07',
    department: 'HPLC & Chromatography Lab',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst8',
    email: 'analyst8@citypharma.com',
    fullName: 'Zeeshan Ali',
    employeeId: 'EMP-ANL-08',
    department: 'Physical & Dissolution Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst9',
    email: 'analyst9@citypharma.com',
    fullName: 'Zainab Bibi',
    employeeId: 'EMP-ANL-09',
    department: 'Microbiological & Endotoxin Testing',
    assignedLab: 'GENERAL',
  },
  {
    username: 'analyst10',
    email: 'analyst10@citypharma.com',
    fullName: 'Omer Farooq',
    employeeId: 'EMP-ANL-10',
    department: 'Stability & Release Inspection',
    assignedLab: 'GENERAL',
  },
];

async function main() {
  console.log('--- SEEDING / UPDATING STATIC WORKFLOW USERS (Admin & 10 Testing Analysts) ---');

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('lims123', salt);
  const analystHash = await bcrypt.hash('lab123', salt);

  // 1. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@citypharma.com' },
    update: {
      username: 'admin',
      passwordHash: adminHash,
      fullName: 'Dr. Muhammad Jamil (Administrator)',
      department: 'QC & Administration',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@citypharma.com',
      username: 'admin',
      passwordHash: adminHash,
      fullName: 'Dr. Muhammad Jamil (Administrator)',
      employeeId: 'EMP-001',
      department: 'QC & Administration',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('✓ Configured Administrator User:', adminUser.username, adminUser.email);

  const genHash = await bcrypt.hash('gen123', salt);
  const penHash = await bcrypt.hash('pen123', salt);
  const cephHash = await bcrypt.hash('ceph123', salt);

  // 2b. Three Dedicated Laboratory Accounts
  const LAB_ACCOUNTS = [
    {
      username: 'general',
      email: 'general@citypharma.com',
      fullName: 'General Lab Personnel',
      employeeId: 'EMP-LAB-GL',
      department: 'General QC Testing Suite',
      assignedLab: 'GENERAL',
      passwordHash: genHash,
      pass: 'gen123',
    },
    {
      username: 'penicillin',
      email: 'penicillin@citypharma.com',
      fullName: 'Penicillin Lab Specialist',
      employeeId: 'EMP-LAB-PEN',
      department: 'Penicillin QC Containment Suite',
      assignedLab: 'PENICILLIN',
      passwordHash: penHash,
      pass: 'pen123',
    },
    {
      username: 'cephalosporin',
      email: 'cephalosporin@citypharma.com',
      fullName: 'Cephalosporin Lab Specialist',
      employeeId: 'EMP-LAB-CEPH',
      department: 'Cephalosporin Sterile Suite',
      assignedLab: 'CEPHALOSPORIN',
      passwordHash: cephHash,
      pass: 'ceph123',
    },
  ];

  for (const labUser of LAB_ACCOUNTS) {
    await prisma.user.upsert({
      where: { email: labUser.email },
      update: {
        username: labUser.username,
        passwordHash: labUser.passwordHash,
        fullName: labUser.fullName,
        employeeId: labUser.employeeId,
        department: labUser.department,
        assignedLab: labUser.assignedLab,
        role: Role.ANALYST,
        isActive: true,
      },
      create: {
        email: labUser.email,
        username: labUser.username,
        passwordHash: labUser.passwordHash,
        fullName: labUser.fullName,
        employeeId: labUser.employeeId,
        department: labUser.department,
        assignedLab: labUser.assignedLab,
        role: Role.ANALYST,
        isActive: true,
      },
    });
    console.log(`✓ Seeded Laboratory Account: ${labUser.username} (${labUser.fullName}) - Password: ${labUser.pass}`);
  }

  // 3. 10 Dedicated Testing Analysts
  for (const anl of STATIC_ANALYSTS) {
    const user = await prisma.user.upsert({
      where: { email: anl.email },
      update: {
        username: anl.username,
        passwordHash: analystHash,
        fullName: anl.fullName,
        employeeId: anl.employeeId,
        department: anl.department,
        assignedLab: anl.assignedLab,
        role: Role.ANALYST,
        isActive: true,
      },
      create: {
        email: anl.email,
        username: anl.username,
        passwordHash: analystHash,
        fullName: anl.fullName,
        employeeId: anl.employeeId,
        department: anl.department,
        assignedLab: anl.assignedLab,
        role: Role.ANALYST,
        isActive: true,
      },
    });
    console.log(`✓ Seeded Analyst: ${user.username} (${user.fullName}) [${user.employeeId}] - Password: lab123`);
  }

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      employeeId: true,
      fullName: true,
      department: true,
      role: true,
    },
    orderBy: { username: 'asc' },
  });
  console.table(allUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
