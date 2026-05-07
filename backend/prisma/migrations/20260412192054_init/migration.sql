-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "speciesId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pond_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tempMin" DOUBLE PRECISION,
    "tempMax" DOUBLE PRECISION,
    "phMin" DOUBLE PRECISION,
    "phMax" DOUBLE PRECISION,
    "ecMin" DOUBLE PRECISION,
    "ecMax" DOUBLE PRECISION,
    "doMin" DOUBLE PRECISION,
    "doMax" DOUBLE PRECISION,
    "alkalinityMin" DOUBLE PRECISION,
    "alkalinityMax" DOUBLE PRECISION,
    "ammoniaMin" DOUBLE PRECISION,
    "ammoniaMax" DOUBLE PRECISION,
    "nitriteMin" DOUBLE PRECISION,
    "nitriteMax" DOUBLE PRECISION,
    "nitrateMin" DOUBLE PRECISION,
    "nitrateMax" DOUBLE PRECISION,
    "salinityMin" DOUBLE PRECISION,
    "salinityMax" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pond_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dosage" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ras_systems" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "systemCode" TEXT,
    "systemVolume" DOUBLE PRECISION,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ras_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ponds" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "departmentId" TEXT,
    "groupId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tankStatus" TEXT DEFAULT 'Active',
    "lastUpdated" TIMESTAMP(3),
    "temperature" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "ec" DOUBLE PRECISION,
    "do" DOUBLE PRECISION,
    "alkalinity" DOUBLE PRECISION,
    "ammonia" DOUBLE PRECISION,
    "nitrite" DOUBLE PRECISION,
    "nitrate" DOUBLE PRECISION,
    "salinity" DOUBLE PRECISION,
    "turbidity" DOUBLE PRECISION,
    "fishCount" INTEGER,
    "species" TEXT,
    "strainOrLine" TEXT,
    "femalesCount" INTEGER,
    "malesCount" INTEGER,
    "stockingDate" TIMESTAMP(3),
    "density" TEXT,
    "fishSize" TEXT,
    "stage" TEXT,
    "forSale" TEXT,
    "gridRow" INTEGER,
    "gridColumn" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ponds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT,
    "currentTankId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "species" TEXT,
    "group" TEXT,
    "line" TEXT,
    "stockingDate" TIMESTAMP(3),
    "fishCount" INTEGER,
    "avgWeight" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fish_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_samples" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tankNumber" TEXT,
    "pondId" TEXT,
    "group" TEXT,
    "line" TEXT,
    "fishExamined" INTEGER,
    "finding1" TEXT,
    "finding2" TEXT,
    "finding3" TEXT,
    "finding4" TEXT,
    "finding5" TEXT,
    "diagnosis" TEXT,
    "images" TEXT[],
    "notes" TEXT,
    "treatment" TEXT,
    "treatmentDate" TIMESTAMP(3),
    "treatedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pondId" TEXT,
    "tankNumber" TEXT,
    "treatmentName" TEXT,
    "activeSubstance" TEXT,
    "dosage" TEXT,
    "appliedBy" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_quality_measurements" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT,
    "pondId" TEXT,
    "temperature" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "ec" DOUBLE PRECISION,
    "do" DOUBLE PRECISION,
    "alkalinity" DOUBLE PRECISION,
    "ammonia" DOUBLE PRECISION,
    "nitrite" DOUBLE PRECISION,
    "nitrate" DOUBLE PRECISION,
    "salinity" DOUBLE PRECISION,
    "turbidity" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_quality_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_records" (
    "id" TEXT NOT NULL,
    "systemId" TEXT,
    "pondId" TEXT,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION,
    "direction" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_acknowledgments" (
    "id" TEXT NOT NULL,
    "pondId" TEXT,
    "metricType" TEXT NOT NULL,
    "acknowledgedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spawning_systems" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "systemNumber" TEXT NOT NULL,
    "spawn1Group" TEXT,
    "spawn1Line" TEXT,
    "spawn1NumberOfTanks" INTEGER,
    "spawn2Group" TEXT,
    "spawn2Line" TEXT,
    "spawn2NumberOfTanks" INTEGER,
    "spawn3Group" TEXT,
    "spawn3Line" TEXT,
    "spawn3NumberOfTanks" INTEGER,
    "spawn4Group" TEXT,
    "spawn4Line" TEXT,
    "spawn4NumberOfTanks" INTEGER,
    "notes" TEXT,
    "createdByName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spawning_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_history" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "userId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "systemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- AddForeignKey
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ras_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "pond_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fish_batches" ADD CONSTRAINT "fish_batches_currentTankId_fkey" FOREIGN KEY ("currentTankId") REFERENCES "ponds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_samples" ADD CONSTRAINT "health_samples_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "ponds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "ponds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_measurements" ADD CONSTRAINT "water_quality_measurements_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ras_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_measurements" ADD CONSTRAINT "water_quality_measurements_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "ponds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_records" ADD CONSTRAINT "alert_records_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ras_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_history" ADD CONSTRAINT "audit_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_history" ADD CONSTRAINT "audit_history_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ras_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
