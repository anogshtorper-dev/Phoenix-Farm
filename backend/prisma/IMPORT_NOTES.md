# Base44 Data Import Notes

This project was prepared to load the latest Base44 exports into the current Prisma/PostgreSQL database **without changing the runtime application code**.

## What was added

- `backend/prisma/base44_export_csv/` — original CSV exports from Base44
- `backend/prisma/base44_export_json/` — JSON snapshots generated from those CSVs for reliable import without extra npm packages
- `backend/prisma/seed.js` — updated seed script that imports the exported data into the current Prisma schema

## How to load the data

From the `backend` folder:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
```

For a local development database, use `npx prisma migrate dev --name init` before `npm run seed`.

## Important notes

- No frontend or backend route logic was changed.
- The import keeps the current Prisma schema and maps the Base44 data into it as closely as possible.
- Some Base44-only fields that do not exist in the current schema are preserved in the raw export files but are not inserted into the database.
- `FishType_export.csv` and `PondType_export.csv` do not have matching tables in the current Prisma schema, so they are kept for reference only.
- Treatment and alert records were mapped to the closest matching fields in the current schema.

## Default login after seeding

- `admin@phoenixfarm.com` / `admin123`
- `worker@phoenixfarm.com` / `user123`
