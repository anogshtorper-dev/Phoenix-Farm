# Phoenix Farm

Phoenix Farm is a web-based fish farm management system designed to support the daily operational, biological, and administrative work of a modern aquaculture facility.

The system centralizes information that is often scattered across spreadsheets, notes, and disconnected tools, and turns it into a structured, accessible, and maintainable platform. It is intended to help farm staff monitor ponds and systems, manage fish health and treatments, record water quality measurements, review alerts, and maintain operational visibility across the farm.

---

## 1. Purpose of the System

The main goal of Phoenix Farm is to create a single source of truth for fish farm operations.

Instead of relying on manual tracking and fragmented records, the system allows users to work through a unified platform that supports:

- pond and system monitoring
- water quality tracking
- fish health documentation
- treatment and follow-up management
- alert visibility
- administrative configuration
- user authentication and access control

This improves traceability, consistency, transparency, and decision-making.

---

## 2. What the System Can Do

Phoenix Farm currently supports the following core capabilities:

### Authentication and Access
Users can log in securely and access the system according to their permissions.

### Dashboard and Operational Visibility
The system provides a central operational view of the farm and allows users to quickly understand the current status of systems, ponds, and activity.

### RAS / System Management
Users can manage recirculating aquaculture systems and the ponds associated with them.

### Pond Management
Each pond can contain operational and biological information such as:

- pond number
- associated system
- department or group
- status
- fish count
- species / line
- stocking information
- notes
- live metric values where relevant

### Water Quality Monitoring
Users can record and review water quality measurements such as:

- temperature
- pH
- dissolved oxygen
- ammonia
- nitrite
- nitrate
- salinity
- turbidity
- alkalinity
- EC

This allows the farm to maintain historical records and identify changes over time.

### Fish Health & Sampling
The system supports health sample documentation, including:

- date
- pond / tank
- findings
- diagnosis
- treatment recommendation
- treatment date
- responsible person
- status
- notes
- image support where configured

### Treatments
Users can document and manage treatments that were applied in the farm, including:

- treatment name
- active substance
- dosage
- date
- status
- responsible person
- notes

### Alerts
The system is designed to support alert visibility for abnormal or critical measurements and help users identify issues that require attention.

### Admin and Reference Data
Administrative users can manage reference entities such as:

- departments
- treatment presets
- systems
- other configurable records required for farm operation

---

## 3. Why This System Matters

Fish farm operations require accurate, timely, and structured information.

Without a system like Phoenix Farm, staff often depend on manual communication, spreadsheets, and disconnected records. That creates risks such as:

- missing or inconsistent data
- delayed response to health or water quality issues
- poor traceability
- duplicate work
- reduced visibility across the farm

Phoenix Farm helps reduce those risks by making the system:

- centralized
- structured
- easier to maintain
- easier to use across devices
- more transparent for future users and maintainers

---

## 4. Tech Stack

### Frontend
- React
- Vite

### Backend
- Node.js
- Express

### Database
- PostgreSQL (hosted on Neon)

### ORM
- Prisma

### Hosting
- Render

---

## 5. Project Structure

```text
frontend/
backend/
render.yaml
README.md
Frontend

Contains the client-side application.

Backend

Contains the API server, Prisma schema, routes, authentication logic, and database integration.

render.yaml

Deployment-related configuration file.

6. Public Links
Frontend

The public system URL is:

https://phoenix-farm-frontend.onrender.com/

Backend

The backend is deployed separately on Render and exposes API routes and a health endpoint.

A working backend health check should return JSON at:

https://<your-backend-service>.onrender.com/health

Example response:

{"ok": true, "time": "2026-04-13T14:52:25.715Z"}

Note: Opening the backend root URL (/) may return Cannot GET /.
This is normal if no homepage route is defined. The backend is an API service, not a website.

7. First-Time Local Setup

This section explains how to run the system for the first time on a local machine.

Step 1 — Clone the repository
git clone https://github.com/anogshtorper-dev/Phoenix-Farm.git
cd Phoenix-Farm
Step 2 — Create environment files
Backend

Create:

backend/.env

Example:

NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
ADMIN_REGISTER_SECRET=replace-with-a-secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ALLOWED_ORIGINS=http://localhost:5173
Frontend

Create:

frontend/.env.local

Example:

VITE_API_URL=http://localhost:3001/api
Step 3 — Install backend dependencies
cd backend
npm install
Step 4 — Generate Prisma client
npx prisma generate
Step 5 — Run database migrations
npx prisma migrate dev --name init
Step 6 — Seed the database
npm run seed
Step 7 — Start the backend
npm run dev

The backend health check should now work at:

http://localhost:3001/health

Step 8 — Install frontend dependencies

Open another terminal:

cd frontend
npm install
Step 9 — Start the frontend
npm run dev

The frontend should run locally at:

http://localhost:5173

8. Default Login Credentials

If the seed was executed successfully, the following demo users should exist:

Admin User
Email: admin@phoenixfarm.com
Password: admin123
Worker User
Email: worker@phoenixfarm.com
Password: user123

If these credentials do not work, the seed was probably not executed against the correct database.

9. Deployment Architecture

Phoenix Farm is deployed using two main external services:

Render

Used to host:

the backend API
the frontend static site
Neon

Used to host:

the PostgreSQL database

This means the application is split into:

frontend service
backend service
hosted database
10. Render Maintenance Guide

Render is the platform used to deploy and manage the live application.

What can be managed from the Render dashboard

From the Render dashboard you can:

see whether each service is live
view build logs
view runtime logs
redeploy services manually
restart services
update environment variables
inspect public URLs
connect deployments to GitHub pushes
Backend configuration on Render

Recommended backend service setup:

Service type: Web Service
Root Directory: backend
Build Command:
npm install && npm run prisma:generate && npm run prisma:deploy
Start Command:
npm start
Frontend configuration on Render

Recommended frontend service setup:

Service type: Static Site
Root Directory: frontend
Build Command:
npm install && npm run build
Publish Directory:
dist
Important note about free / low-usage environments

Render services may take longer to respond after inactivity, especially on lower-cost plans. The first request after a long idle period may feel slower than usual.

When to redeploy Render

A redeploy is usually needed when:

code was changed in GitHub
environment variables were changed
a build failed and must be retried
a service became unstable and needs a restart
Recommended routine checks in Render

At least occasionally, verify:

the backend service is live
the frontend service is live
the backend /health endpoint responds
logs do not show repeated runtime errors
the latest deploy completed successfully
11. Neon Maintenance Guide

Neon hosts the PostgreSQL database used by the system.

What can be managed from the Neon dashboard

From the Neon dashboard you can:

access the database project
copy the connection string
manage branches
review database status
monitor database activity
create or manage roles and databases
What Neon is used for in this project

Neon stores:

users
ponds
systems
water quality measurements
health samples
treatments
alerts
admin configuration data
audit-related records
Important operational note

The live application depends on the Neon database connection string being correctly configured in Render as DATABASE_URL.

If DATABASE_URL is wrong or missing:

the backend may fail to start
Prisma migrations may fail
login may fail
seeded users may not exist where expected
Recommended routine checks in Neon

Occasionally verify:

the project is active
the correct database is being used
the connection string matches the one configured in Render
no unexpected database branch or environment mismatch exists
12. Required Environment Variables
Backend

Required or commonly used variables:

DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
ADMIN_REGISTER_SECRET=
NODE_ENV=production
ALLOWED_ORIGINS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
Frontend
VITE_API_URL=
Example production values
Backend
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d
ADMIN_REGISTER_SECRET=another-secret
NODE_ENV=production
ALLOWED_ORIGINS=https://phoenix-farm-frontend.onrender.com
Frontend
VITE_API_URL=https://<your-backend-service>.onrender.com/api
13. Common Troubleshooting
1. Frontend opens, but API actions fail

Possible causes:

VITE_API_URL is wrong
backend is down
ALLOWED_ORIGINS does not include the frontend URL
CORS issue
backend environment variables are missing
2. Backend root URL shows Cannot GET /

This is normal if no route exists for /.
Use /health to verify the backend instead.

3. Login does not work

Possible causes:

database seed was not executed
DATABASE_URL points to the wrong database
backend cannot reach Neon
incorrect credentials are being used
4. Frontend works locally but not from another device

Possible causes:

trying to open localhost from another device
backend ALLOWED_ORIGINS does not include the deployed frontend URL
frontend VITE_API_URL still points to local backend
mobile browser or network issue
5. Render build fails with prisma: Permission denied

Recommended fix:

run Prisma through npm scripts or node, not through a broken executable path
ensure the backend build command uses the project’s working scripts
6. Render build fails with vite: Permission denied

Possible causes:

node_modules or build artifacts were committed to GitHub
the repository included files generated on another operating system

Recommended fix:

ensure .gitignore excludes node_modules/
remove tracked node_modules
redeploy
7. npm install hangs or times out locally

Possible causes:

wrong npm registry
proxy / VPN / DNS issues
Windows-specific environment or networking problems

Recommended checks:

npm config get registry
npm ping

Recommended registry:

https://registry.npmjs.org/
8. Health check fails

If /health does not return a valid response:

backend service may be down
backend start command may be wrong
environment variables may be missing
Neon connection may be failing
9. Seed users do not exist in production

Possible causes:

migrations ran successfully, but seed was never executed on the production database
the application is connected to a different Neon database than expected

Recommended checks:

verify the DATABASE_URL in Render
verify that the expected users exist in the connected Neon database
run the seed manually if necessary
14. Ongoing Operational Transparency

This project is intended to remain understandable and maintainable even for someone who did not originally build it.

To keep the system transparent over time:

always document environment variable changes
keep deployment settings consistent between local and production environments
avoid hardcoding secrets in code
do not commit .env files
do not commit node_modules
test login and /health after every important deployment
keep README updated when the architecture changes
record any future admin credentials or onboarding changes in a secure internal note
15. Recommended Post-Deployment Checks

After any important deployment, verify the following:

backend /health endpoint returns success
frontend URL loads successfully
login works
one or more main screens load correctly
no critical frontend console errors are visible
no repeated backend runtime errors appear in Render logs
data can be read from Neon-backed records
16. Security and Good Practices

To keep the system secure and maintainable:

keep secrets only in environment variables
never store production secrets in GitHub
use private repositories when appropriate
rotate secrets if they were ever exposed
restrict admin credentials and share them only with authorized users
review Render and Neon configuration after major changes
17. Suggested Future Improvements

Possible future improvements include:

stronger role-based access control
audit trail expansion
richer alert logic and threshold management
historical dashboards and trend analysis
improved mobile responsiveness
image upload hardening and file validation
automated backup and restore documentation
onboarding documentation for non-technical users
18. Support and Ownership

If future users or maintainers need to troubleshoot the system, the first places to inspect are:

Render backend logs
Render frontend deploy logs
Neon connection configuration
environment variables
Prisma migration / seed status

This README should be kept updated whenever:

deployment settings change
environment variables change
system modules are added or removed
login behavior changes
infrastructure is replaced or extended
19. Quick Operational Checklist

Use this short checklist whenever the system is updated or handed over:

verify backend /health
verify frontend loads
verify login works
verify Render services are live
verify Neon database is the expected one
verify ALLOWED_ORIGINS matches the frontend URL
verify VITE_API_URL matches the backend URL
verify secrets are not committed to GitHub
