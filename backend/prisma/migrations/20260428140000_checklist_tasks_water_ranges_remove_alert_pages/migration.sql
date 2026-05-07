CREATE TABLE IF NOT EXISTS "checklist_tasks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ok_notok',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checklist_tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_tasks_key_key" ON "checklist_tasks"("key");

CREATE TABLE IF NOT EXISTS "water_quality_valid_ranges" (
    "id" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION NOT NULL,
    "maxValue" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "water_quality_valid_ranges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "water_quality_valid_ranges_parameterName_key" ON "water_quality_valid_ranges"("parameterName");

INSERT INTO "checklist_tasks" ("id", "key", "label", "type", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('default-sand-filter', 'sandFilter', 'Sand Filter', 'ok_notok', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-ozone-mixing-tank', 'ozoneMixingTank', 'Ozone Mixing Tank', 'ok_notok', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-buffer-tank', 'bufferTank', 'Buffer Tank', 'full_empty', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-trickling-filter-towers', 'tricklingFilterTowers', 'Trickling Filter Towers', 'ok_notok', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-hydrocyclone', 'hydrocyclone', 'Hydrocyclone', 'ok_notok', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-ozon', 'ozon', 'Ozon', 'ok_notok_with_power', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-hydrocyclone-screen', 'hydrocycloneScreen', 'Hydrocyclone Screen', 'ok_notok', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default-sand-filter-screen', 'sandFilterScreen', 'Sand Filter Screen', 'ok_notok', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

DROP TABLE IF EXISTS "alert_records";
