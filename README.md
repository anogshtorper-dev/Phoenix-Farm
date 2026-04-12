<<<<<<< HEAD
# Phoenix Farm — Standalone Migration

This is the fully migrated version of the Phoenix Farm fish farm management system.
All Base44 SDK dependencies have been removed and replaced with an independent full-stack architecture.

## Architecture

```
/migration
  /backend          Node.js + Express + Prisma + PostgreSQL
  /frontend         React + Vite (standalone, no Base44 SDK)
  render.yaml       One-click Render deployment blueprint
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ **or** a free [Neon](https://neon.tech) account (cloud Postgres)
- A free [Cloudinary](https://cloudinary.com) account (image uploads)

---

### 1. Clone / extract the project

```bash
# After unzipping the migration package:
cd migration
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

Create the backend environment file:

```bash
cp .env.example .env
```

Edit `backend/.env` and fill in every value:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET=a-very-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
ALLOWED_ORIGINS=http://localhost:5173
PORT=3001
```

---

### 3. Database migration

Generate the Prisma client and run migrations:

```bash
# From /backend
npx prisma generate
npx prisma migrate dev --name init
```

> **Neon users:** paste your Neon connection string (with `?sslmode=require`) as `DATABASE_URL`.
> Neon's free tier is enough for development and small production workloads.

Verify the schema was applied:

```bash
npx prisma studio   # opens a browser-based DB explorer at localhost:5555
```

---

### 4. Seed initial data

```bash
node src/lib/seed.js
```

This creates:
- Admin user: `admin@phoenixfarm.com` / `admin123`
- Worker user: `worker@phoenixfarm.com` / `user123`
- 4 RAS systems, sample ponds, departments, species, a pond group, and treatment presets

**Change the default passwords immediately after first login.**

---

### 5. Start the backend

```bash
npm run dev       # nodemon watch mode
# or
npm start         # production mode
```

The API will be running at `http://localhost:3001`.
Health check: `http://localhost:3001/health`

---

### 6. Frontend setup

```bash
cd ../frontend
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3001/api
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Cloudinary Setup (Image Uploads)

Health sample images are uploaded to Cloudinary.

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account.
2. From the Cloudinary dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Paste all three into `backend/.env`.
4. Images will be stored under the `phoenix-farm/` folder in your Cloudinary media library.

> Cloudinary's free tier provides 25 GB storage and 25 GB bandwidth/month — more than enough for a fish farm.

---

## Deployment to Render + Neon

### Step 1 — Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a new project called `phoenix-farm`.
3. From the **Connection Details** panel, copy the connection string:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this for the next step.

### Step 2 — Push code to GitHub

```bash
git init
git add .
git commit -m "Phoenix Farm standalone migration"
git remote add origin https://github.com/YOUR_ORG/phoenix-farm.git
git push -u origin main
```

### Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) and create a free account.
2. Click **New → Blueprint** and connect your GitHub repo.
3. Render will detect `render.yaml` and create two services automatically:
   - `phoenix-farm-api` (backend)
   - `phoenix-farm-frontend` (static site)

### Step 4 — Set environment variables on Render

For the **backend service** (`phoenix-farm-api`), set these in the Render dashboard under **Environment**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `ALLOWED_ORIGINS` | `https://phoenix-farm-frontend.onrender.com` |

For the **frontend service** (`phoenix-farm-frontend`):

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://phoenix-farm-api.onrender.com/api` |

### Step 5 — Run seed on Render

After the first deploy, open the Render backend service shell (or use a one-off job):

```bash
node src/lib/seed.js
```

### Step 6 — Access the app

Your app will be live at:
- **Frontend:** `https://phoenix-farm-frontend.onrender.com`
- **API:** `https://phoenix-farm-api.onrender.com`

> **Note on Render free tier:** Services sleep after 15 minutes of inactivity.
> The first request after sleep takes ~30 seconds to wake up.
> Upgrade to a paid plan ($7/month) to keep the service always on.

---

## Authentication

The system uses JWT-based authentication.

- Default admin: `admin@phoenixfarm.com` / `admin123`
- Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`)
- To create additional users, use the `/api/auth/register` endpoint with the `adminSecret` field (set `ADMIN_REGISTER_SECRET` in `.env`)
- Role values: `"admin"` or `"user"`

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/login`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| GET/POST/PUT/DELETE | `/api/ponds` | Tank management |
| GET/POST/PUT/DELETE | `/api/systems` | RAS systems |
| GET/POST/PUT/DELETE | `/api/departments` | Departments |
| GET/POST/PUT/DELETE | `/api/fish-batches` | Fish batches |
| POST | `/api/fish-batches/:id/transfer` | Transfer batch |
| POST | `/api/fish-batches/:id/pull` | Pull/deactivate batch |
| GET/POST/PUT/DELETE | `/api/health-samples` | Health records |
| GET/POST/PUT/DELETE | `/api/treatments` | Treatment records |
| GET/POST | `/api/water-quality` | Water quality measurements |
| GET/POST | `/api/alerts` | Alert records |
| GET/POST/DELETE | `/api/alerts/acknowledgments` | Metric acknowledgments |
| GET/POST/PUT/DELETE | `/api/spawning` | Spawning events |
| GET/POST | `/api/audit` | Audit history |
| POST | `/api/upload` | Upload image to Cloudinary |

---

## Migrated Files Summary

| Category | Files |
|----------|-------|
| Backend routes | 16 route files |
| Prisma schema | 14 models |
| Frontend pages | 13 pages |
| Dashboard components | 6 components |
| Health components | 2 components |
| Admin components | 7 components |
| Report components | 7 components |
| Water quality component | 1 component |
| API layer | 4 files |
| Auth system | 3 files |
| Deployment config | 3 files |

**Total: 78+ files migrated or created from scratch.**
=======
# Phoenix-Farm
>>>>>>> 44dfbffb8faa4db2367a43a870c82d3137607b90
