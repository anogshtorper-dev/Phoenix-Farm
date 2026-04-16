require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

const IMPORT_DIR = path.join(__dirname, 'base44_export_json');

function hasImportData() {
  return fs.existsSync(IMPORT_DIR) && fs.readdirSync(IMPORT_DIR).some((f) => f.endsWith('.json'));
}

function readJson(name) {
  const filePath = path.join(IMPORT_DIR, name);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toBool(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return fallback;
}

function toInt(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toFloat(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toDate(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toStringOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function parseJsonArrayString(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

async function clearDatabase() {
  await prisma.auditHistory.deleteMany();
  await prisma.metricAcknowledgment.deleteMany();
  await prisma.alertRecord.deleteMany();
  await prisma.waterQualityMeasurement.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.healthSample.deleteMany();
  await prisma.fishBatch.deleteMany();
  await prisma.pond.deleteMany();
  await prisma.spawningSystem.deleteMany();
  await prisma.treatmentPreset.deleteMany();
  await prisma.line.deleteMany();
  await prisma.species.deleteMany();
  await prisma.pondGroup.deleteMany();
  await prisma.department.deleteMany();
  await prisma.rASSystem.deleteMany();
  await prisma.user.deleteMany();
}

async function createDefaultUsers() {
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const workerPasswordHash = await bcrypt.hash('user123', 12);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@phoenixfarm.com',
        passwordHash: adminPasswordHash,
        fullName: 'Admin User',
        role: 'admin',
        isActive: true,
      },
      {
        email: 'worker@phoenixfarm.com',
        passwordHash: workerPasswordHash,
        fullName: 'Farm Worker',
        role: 'user',
        isActive: true,
      },
    ],
  });
}

async function importBase44Data() {
  console.log('Import mode detected: loading Base44 export data into Prisma database...');
  await clearDatabase();
  await createDefaultUsers();

  const departments = readJson('Department_export.json');
  if (departments.length) {
    await prisma.department.createMany({
      data: departments.map((row) => ({
        id: row.id,
        name: row.name,
        isActive: toBool(row.isActive, true),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const speciesRows = readJson('Species_export.json');
  if (speciesRows.length) {
    await prisma.species.createMany({
      data: speciesRows.map((row) => ({
        id: row.id,
        name: row.name,
        isActive: toBool(row.isActive, true),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
      skipDuplicates: true,
    });
  }

  const speciesByName = new Map(
    (await prisma.species.findMany({ select: { id: true, name: true } })).map((s) => [s.name, s.id])
  );

  const lines = readJson('Line_export.json');
  if (lines.length) {
    await prisma.line.createMany({
      data: lines.map((row) => ({
        id: row.id,
        name: row.name,
        speciesId: speciesByName.get(row.speciesName) || null,
        isActive: toBool(row.isActive, true),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const pondGroups = readJson('PondGroup_export.json');
  if (pondGroups.length) {
    await prisma.pondGroup.createMany({
      data: pondGroups.map((row) => ({
        id: row.id,
        name: row.name,
        tempMin: toFloat(row.tempMin),
        tempMax: toFloat(row.tempMax),
        phMin: toFloat(row.phMin),
        phMax: toFloat(row.phMax),
        ecMin: toFloat(row.ecMin),
        ecMax: toFloat(row.ecMax),
        doMin: toFloat(row.doMin),
        doMax: toFloat(row.doMax),
        alkalinityMin: toFloat(row.alkalinityMin),
        alkalinityMax: toFloat(row.alkalinityMax),
        ammoniaMin: toFloat(row.ammoniaMin),
        ammoniaMax: toFloat(row.ammoniaMax),
        nitriteMin: toFloat(row.nitriteMin),
        nitriteMax: toFloat(row.nitriteMax),
        nitrateMin: toFloat(row.nitrateMin),
        nitrateMax: toFloat(row.nitrateMax),
        salinityMin: toFloat(row.salinityMin),
        salinityMax: toFloat(row.salinityMax),
        isActive: toBool(row.isActive, true),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

const rasSystems = readJson('RASSystem_export.json');
const pondsForSystemCheck = readJson('Pond_export.json');

if (rasSystems.length) {
  const existingSystemIds = new Set(rasSystems.map((row) => String(row.id)));
  const missingSystemIds = [
    ...new Set(
      pondsForSystemCheck
        .map((row) => row.systemId)
        .filter((id) => id && !existingSystemIds.has(String(id)))
        .map((id) => String(id))
    ),
  ];

  if (missingSystemIds.length) {
    console.log(`Creating ${missingSystemIds.length} placeholder RAS systems for missing foreign keys...`);
    missingSystemIds.forEach((id) => {
      console.log(`- Placeholder system created for missing id=${id}`);
    });
  }

  const allSystems = [
    ...rasSystems.map((row) => ({
      id: row.id,
      systemName: row.systemName || `System ${String(row.id).slice(-4)}`,
      systemCode: toStringOrNull(row.systemCode),
      systemVolume: toFloat(row.systemVolume),
      sortOrder: toInt(row.sortOrder),
      isActive: toBool(row.isActive, true),
      createdAt: toDate(row.created_date, new Date()),
      updatedAt: toDate(row.updated_date, new Date()),
    })),
    ...missingSystemIds.map((id, index) => ({
      id,
      systemName: `Imported Legacy System ${index + 1}`,
      systemCode: `LEGACY-${id.slice(-4)}`,
      systemVolume: null,
      sortOrder: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  ];

  await prisma.rASSystem.createMany({
    data: allSystems,
  });
}

  const ponds = readJson('Pond_export.json');
if (ponds.length) {
  const validPonds = ponds.filter((row) => row.systemId);

  const skippedPonds = ponds.filter((row) => !row.systemId);
  if (skippedPonds.length) {
    console.log(`Skipping ${skippedPonds.length} pond records with missing systemId...`);
    skippedPonds.forEach((row) => {
      console.log(`- Skipped pond id=${row.id}, number=${row.number}`);
    });
  }

  await prisma.pond.createMany({
    data: validPonds.map((row) => ({
      id: row.id,
      number: row.number,
      systemId: row.systemId,
      departmentId: toStringOrNull(row.departmentId),
      groupId: toStringOrNull(row.groupId),
      isActive: toBool(row.isActive, true),
      tankStatus: toStringOrNull(row.tankStatus) || 'Active',
      lastUpdated: toDate(row.lastUpdated, toDate(row.updated_date, new Date())),
      temperature: toFloat(row.temperature),
      ph: toFloat(row.ph),
      ec: toFloat(row.ec),
      do: toFloat(row.do),
      alkalinity: toFloat(row.alkalinity),
      ammonia: toFloat(row.ammonia),
      nitrite: toFloat(row.nitrite),
      nitrate: toFloat(row.nitrate),
      salinity: toFloat(row.salinity),
      turbidity: null,
      fishCount: toInt(row.fishCount),
      species: toStringOrNull(row.species),
      strainOrLine: toStringOrNull(row.strainOrLine),
      femalesCount: toInt(row.femalesCount),
      malesCount: toInt(row.malesCount),
      stockingDate: toDate(row.stockingDate),
      density: toStringOrNull(row.density),
      fishSize: toStringOrNull(row.fishSize),
      stage: toStringOrNull(row.stage),
      forSale: toStringOrNull(row.forSale),
      gridRow: toInt(row.gridRow),
      gridColumn: toInt(row.gridColumn),
      notes: toStringOrNull(row.notes),
      createdAt: toDate(row.created_date, new Date()),
      updatedAt: toDate(row.updated_date, new Date()),
    })),
  });
}

  const pondsByNumber = new Map(
    (await prisma.pond.findMany({ select: { id: true, number: true } })).map((p) => [p.number, p.id])
  );

const fishBatches = readJson('FishBatch_export.json');
if (fishBatches.length) {
  const existingPondIds = new Set(
    ponds
      .filter((row) => row.systemId)
      .map((row) => String(row.id))
  );

  const invalidFishBatchTankRefs = fishBatches.filter(
    (row) => row.currentTankId && !existingPondIds.has(String(row.currentTankId))
  );

  if (invalidFishBatchTankRefs.length) {
    console.log(
      `FishBatch import: ${invalidFishBatchTankRefs.length} records reference missing currentTankId values. These records will be imported with currentTankId=null.`
    );
    invalidFishBatchTankRefs.forEach((row) => {
      console.log(
        `- FishBatch id=${row.id}, batchCode=${row.batchCode || 'N/A'}, missing currentTankId=${row.currentTankId}, currentTankNumber=${row.currentTankNumber || 'N/A'}`
      );
    });
  }

  await prisma.fishBatch.createMany({
    data: fishBatches.map((row) => ({
      id: row.id,
      batchCode: toStringOrNull(row.batchCode),
      currentTankId:
        row.currentTankId && existingPondIds.has(String(row.currentTankId))
          ? String(row.currentTankId)
          : null,
      isActive: toBool(row.isActive, true),
      species: toStringOrNull(row.group),
      group: toStringOrNull(row.group),
      line: toStringOrNull(row.line),
      stockingDate: toDate(row.stockingDate),
      fishCount: toInt(row.fishCount),
      avgWeight: null,
      notes: toStringOrNull(row.notes),
      createdAt: toDate(row.created_date, new Date()),
      updatedAt: toDate(row.updated_date, new Date()),
    })),
  });
}

  const waterQualityRows = readJson('WaterQualityMeasurement_export.json');
  if (waterQualityRows.length) {
    await prisma.waterQualityMeasurement.createMany({
      data: waterQualityRows.map((row) => ({
        id: row.id,
        date: toDate(row.measuredAt, toDate(row.created_date, new Date())),
        systemId: toStringOrNull(row.systemId),
        pondId: toStringOrNull(row.pondId) || null,
        temperature: toFloat(row.temperature),
        ph: toFloat(row.ph),
        ec: toFloat(row.ec),
        do: toFloat(row.do),
        alkalinity: toFloat(row.alkalinity),
        ammonia: toFloat(row.ammonia),
        nitrite: toFloat(row.nitrite),
        nitrate: toFloat(row.nitrate),
        salinity: null,
        turbidity: null,
        notes: toStringOrNull(row.notes),
        createdBy: toStringOrNull(row.created_by),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const healthSamples = readJson('HealthSample_export.json');
  if (healthSamples.length) {
    await prisma.healthSample.createMany({
      data: healthSamples.map((row) => ({
        id: row.id,
        date: toDate(row.date, toDate(row.created_date, new Date())),
        tankNumber: toStringOrNull(row.tankNumber),
        pondId: pondsByNumber.get(row.tankNumber) || null,
        group: toStringOrNull(row.group),
        line: toStringOrNull(row.line),
        fishExamined: toInt(row.fishExamined),
        finding1: toStringOrNull(row.finding1),
        finding2: toStringOrNull(row.finding2),
        finding3: toStringOrNull(row.finding3),
        finding4: toStringOrNull(row.finding4),
        finding5: toStringOrNull(row.finding5),
        diagnosis: toStringOrNull(row.diagnosis),
        images: parseJsonArrayString(row.images),
        notes: toStringOrNull(row.notes),
        treatment: toStringOrNull(row.treatment),
        treatmentDate: toDate(row.treatmentDate),
        treatedBy: toStringOrNull(row.treatedBy),
        status: toStringOrNull(row.status) || 'Pending',
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const treatmentRows = readJson('Treatment_export.json');
  if (treatmentRows.length) {
    const presets = Array.from(new Set(treatmentRows.map((row) => row.treatmentType).filter(Boolean)));
    if (presets.length) {
      await prisma.treatmentPreset.createMany({
        data: presets.map((name) => ({
          id: `preset-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name,
          description: 'Imported from Base44 export',
          dosage: null,
          notes: null,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.treatment.createMany({
      data: treatmentRows.map((row) => ({
        id: row.id,
        date: toDate(row.date, toDate(row.created_date, new Date())),
        pondId: null,
        tankNumber: null,
        treatmentName: toStringOrNull(row.treatmentType),
        activeSubstance: toStringOrNull(row.treatmentType),
        dosage: row.concentration ? `${row.concentration}${row.concentrationUnit ? ` ${row.concentrationUnit}` : ''}` : null,
        appliedBy: toStringOrNull(row.staffName),
        notes: [toStringOrNull(row.notes), row.systems ? `Systems: ${parseJsonArrayString(row.systems).join(', ')}` : null]
          .filter(Boolean)
          .join(' | ') || null,
        status: toStringOrNull(row.status) || 'Pending',
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const alertRows = readJson('AlertRecord_export.json');
  if (alertRows.length) {
    await prisma.alertRecord.createMany({
      data: alertRows.map((row) => ({
        id: row.id,
        systemId: toStringOrNull(row.systemId),
        pondId: null,
        metricType: row.metricType,
        value: 0,
        threshold: null,
        direction: null,
        isResolved: toBool(row.isResolved, false),
        resolvedAt: toBool(row.isResolved, false) ? toDate(row.updated_date, toDate(row.firstSeenAt)) : null,
        createdAt: toDate(row.firstSeenAt, toDate(row.created_date, new Date())),
      })),
    });
  }

  const ackRows = readJson('MetricAcknowledgment_export.json');
  if (ackRows.length) {
    await prisma.metricAcknowledgment.createMany({
      data: ackRows.map((row) => ({
        id: row.id,
        pondId: toStringOrNull(row.pondId),
        metricType: row.metricType,
        acknowledgedBy: toStringOrNull(row.acknowledgedBy),
        note: toStringOrNull(row.notes),
        createdAt: toDate(row.acknowledgedAt, toDate(row.created_date, new Date())),
      })),
    });
  }

  const spawningRows = readJson('SpawningSystem_export.json');
  if (spawningRows.length) {
    await prisma.spawningSystem.createMany({
      data: spawningRows.map((row) => ({
        id: row.id,
        date: toDate(row.date, toDate(row.created_date, new Date())),
        systemNumber: toStringOrNull(row.systemNumber) || '',
        spawn1Group: toStringOrNull(row.spawn1Group),
        spawn1Line: toStringOrNull(row.spawn1Line),
        spawn1NumberOfTanks: toInt(row.spawn1NumberOfTanks),
        spawn2Group: toStringOrNull(row.spawn2Group),
        spawn2Line: toStringOrNull(row.spawn2Line),
        spawn2NumberOfTanks: toInt(row.spawn2NumberOfTanks),
        spawn3Group: toStringOrNull(row.spawn3Group),
        spawn3Line: toStringOrNull(row.spawn3Line),
        spawn3NumberOfTanks: toInt(row.spawn3NumberOfTanks),
        spawn4Group: toStringOrNull(row.spawn4Group),
        spawn4Line: toStringOrNull(row.spawn4Line),
        spawn4NumberOfTanks: toInt(row.spawn4NumberOfTanks),
        notes: toStringOrNull(row.notes),
        createdByName: toStringOrNull(row.createdByName),
        isActive: toBool(row.isActive, true),
        createdAt: toDate(row.created_date, new Date()),
        updatedAt: toDate(row.updated_date, new Date()),
      })),
    });
  }

  const auditRows = readJson('AuditHistory_export.json');
  if (auditRows.length) {
    const existingSystemIds = new Set((await prisma.rASSystem.findMany({ select: { id: true } })).map((s) => s.id));
    const auditData = auditRows.map((row) => {
      let beforeValue = null;
      let afterValue = null;
      try { beforeValue = row.oldValue ? JSON.parse(row.oldValue) : null; } catch { beforeValue = null; }
      try { afterValue = row.newValue ? JSON.parse(row.newValue) : null; } catch { afterValue = null; }
      const candidateSystemId = afterValue?.systemId || beforeValue?.systemId || null;
      return {
        id: row.id,
        entityType: toStringOrNull(row.entityType) || 'Unknown',
        entityId: toStringOrNull(row.entityId),
        action: toStringOrNull(row.action) || 'Update',
        description: toStringOrNull(row.description),
        performedBy: toStringOrNull(row.performedBy) || toStringOrNull(row.created_by),
        userId: null,
        before: beforeValue,
        after: afterValue,
        systemId: candidateSystemId && existingSystemIds.has(candidateSystemId) ? candidateSystemId : null,
        createdAt: toDate(row.performedAt, toDate(row.created_date, new Date())),
      };
    });
    for (let i = 0; i < auditData.length; i += 100) {
      await prisma.auditHistory.createMany({ data: auditData.slice(i, i + 100) });
    }
  }

  console.log('Base44 import complete.');
  console.log('Imported counts:');
  const counts = {
    departments: await prisma.department.count(),
    species: await prisma.species.count(),
    lines: await prisma.line.count(),
    pondGroups: await prisma.pondGroup.count(),
    systems: await prisma.rASSystem.count(),
    ponds: await prisma.pond.count(),
    fishBatches: await prisma.fishBatch.count(),
    waterQualityMeasurements: await prisma.waterQualityMeasurement.count(),
    healthSamples: await prisma.healthSample.count(),
    treatments: await prisma.treatment.count(),
    alerts: await prisma.alertRecord.count(),
    acknowledgments: await prisma.metricAcknowledgment.count(),
    spawningSystems: await prisma.spawningSystem.count(),
    auditHistory: await prisma.auditHistory.count(),
  };
  console.table(counts);
  console.log('Admin login: admin@phoenixfarm.com / admin123');
  console.log('Worker login: worker@phoenixfarm.com / user123');
}

async function seedFallbackDemoData() {
  console.log('No Base44 import data found. Loading fallback demo seed...');
  await clearDatabase();
  await createDefaultUsers();

  const departmentNames = ['Grow-Out', 'Nursery', 'Breeding', 'Quarantine'];
  const departments = [];
  for (const name of departmentNames) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const dept = await prisma.department.create({ data: { id, name, isActive: true } });
    departments.push(dept);
  }

  for (const name of ['Tilapia', 'Bass', 'Trout', 'Catfish', 'Salmon']) {
    await prisma.species.create({ data: { name } });
  }

  const group = await prisma.pondGroup.create({
    data: {
      id: 'default-group',
      name: 'Standard',
      tempMin: 22,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.5,
      doMin: 5,
      doMax: 12,
      ammoniaMax: 0.5,
      nitriteMax: 0.2,
      nitrateMax: 50,
      isActive: true,
    },
  });

  const systems = [
    { id: 'sys-1', systemName: 'System 1', systemCode: 'SYS1', systemVolume: 50000, sortOrder: 1, isActive: true },
    { id: 'sys-2', systemName: 'System 2', systemCode: 'SYS2', systemVolume: 50000, sortOrder: 2, isActive: true },
    { id: 'sys-3', systemName: 'System 3', systemCode: 'SYS3', systemVolume: 30000, sortOrder: 3, isActive: true },
    { id: 'sys-4', systemName: 'System 4', systemCode: 'SYS4', systemVolume: 30000, sortOrder: 4, isActive: true },
  ];

  await prisma.rASSystem.createMany({ data: systems });

  const pondNumbers = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08'];
  await prisma.pond.createMany({
    data: pondNumbers.map((number, i) => ({
      id: `pond-sys1-${i + 1}`,
      number,
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
    })),
  });

  const presetNames = [
    { name: 'Salt Bath', description: 'NaCl salt bath treatment', dosage: '3g/L for 30min' },
    { name: 'Formalin', description: 'Formalin dip', dosage: '250ppm for 60min' },
    { name: 'Potassium Permanganate', description: 'KMnO4 bath', dosage: '10ppm for 30min' },
  ];
  await prisma.treatmentPreset.createMany({ data: presetNames.map((p) => ({ ...p, isActive: true })) });

  console.log('Fallback demo seed complete.');
  console.log('Admin login: admin@phoenixfarm.com / admin123');
  console.log('Worker login: worker@phoenixfarm.com / user123');
}

async function main() {
  if (hasImportData()) {
    await importBase44Data();
  } else {
    await seedFallbackDemoData();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
