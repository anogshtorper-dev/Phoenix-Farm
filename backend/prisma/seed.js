require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function upsertById(model, id, data) {
  return model.upsert({ where: { id }, update: data, create: { id, ...data } });
}

async function main() {
  console.log('Seeding database...');

  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@phoenixfarm.com' },
    update: { fullName: 'Admin User', role: 'admin', isActive: true },
    create: {
      email: 'admin@phoenixfarm.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      role: 'admin',
    },
  });

  const workerPasswordHash = await bcrypt.hash('user123', 12);
  await prisma.user.upsert({
    where: { email: 'worker@phoenixfarm.com' },
    update: { fullName: 'Farm Worker', role: 'user', isActive: true },
    create: {
      email: 'worker@phoenixfarm.com',
      passwordHash: workerPasswordHash,
      fullName: 'Farm Worker',
      role: 'user',
    },
  });

  const departmentNames = ['Grow-Out', 'Nursery', 'Breeding', 'Quarantine'];
  const departments = [];
  for (const name of departmentNames) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    departments.push(await upsertById(prisma.department, id, { name, isActive: true }));
  }

  for (const name of ['Tilapia', 'Bass', 'Trout', 'Catfish', 'Salmon']) {
    await prisma.species.upsert({ where: { name }, update: { isActive: true }, create: { name } });
  }

  const group = await upsertById(prisma.pondGroup, 'default-group', {
    name: 'Standard',
    tempMin: 22,
    tempMax: 28,
    phMin: 6.5,
    phMax: 8.5,
    doMin: 5.0,
    doMax: 12.0,
    ammoniaMax: 0.5,
    nitriteMax: 0.2,
    nitrateMax: 50,
    isActive: true,
  });

  const systems = [
    { id: 'sys-1', systemName: 'System 1', systemCode: 'SYS1', systemVolume: 50000, sortOrder: 1, isActive: true },
    { id: 'sys-2', systemName: 'System 2', systemCode: 'SYS2', systemVolume: 50000, sortOrder: 2, isActive: true },
    { id: 'sys-3', systemName: 'System 3', systemCode: 'SYS3', systemVolume: 30000, sortOrder: 3, isActive: true },
    { id: 'sys-4', systemName: 'System 4', systemCode: 'SYS4', systemVolume: 30000, sortOrder: 4, isActive: true },
  ];

  for (const system of systems) {
    await upsertById(prisma.rASSystem, system.id, system);
  }

  const pondNumbers = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08'];
  for (let i = 0; i < pondNumbers.length; i += 1) {
    await upsertById(prisma.pond, `pond-sys1-${i + 1}`, {
      number: pondNumbers[i],
      systemId: 'sys-1',
      departmentId: departments[i % departments.length].id,
      groupId: group.id,
      isActive: true,
      tankStatus: 'Active',
      temperature: 24 + Math.random() * 4,
      ph: 7 + Math.random() * 0.5,
      do: 7 + Math.random() * 2,
      ammonia: Math.random() * 0.3,
      lastUpdated: new Date(),
      gridRow: Math.floor(i / 4),
      gridColumn: i % 4,
    });
  }

  for (const preset of [
    { name: 'Salt Bath', description: 'NaCl salt bath treatment', dosage: '3g/L for 30min' },
    { name: 'Formalin', description: 'Formalin dip', dosage: '250ppm for 60min' },
    { name: 'Potassium Permanganate', description: 'KMnO4 bath', dosage: '10ppm for 30min' },
  ]) {
    const existing = await prisma.treatmentPreset.findFirst({ where: { name: preset.name } });
    if (existing) {
      await prisma.treatmentPreset.update({ where: { id: existing.id }, data: preset });
    } else {
      await prisma.treatmentPreset.create({ data: preset });
    }
  }

  console.log('Seed complete!');
  console.log('Admin login: admin@phoenixfarm.com / admin123');
  console.log('Worker login: worker@phoenixfarm.com / user123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
