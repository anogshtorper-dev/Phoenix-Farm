# Phoenix Farm

Phoenix Farm is a web-based fish farm management system designed to support the daily operational, biological, and administrative work of a modern aquaculture facility.

The system centralizes information that is often scattered across spreadsheets, notes, and disconnected tools, and turns it into a structured, accessible, and maintainable platform. It is intended to help farm staff monitor ponds and systems, manage fish health and treatments, record water quality measurements, review alerts, and maintain operational visibility across the farm.

---

## 1. Purpose of the System

The main goal of Phoenix Farm is to create a single source of truth for fish farm operations.

Instead of relying on manual tracking and fragmented records, the system allows users to work through a unified platform that supports:

- Pond and system monitoring
- Water quality tracking
- Fish health documentation
- Treatment and follow-up management
- Alert visibility
- Administrative configuration
- User authentication and access control

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

- Pond number
- Associated system
- Department or group
- Status
- Fish count
- Species / line
- Stocking information
- Notes
- Live metric values where relevant

### Water Quality Monitoring

Users can record and review water quality measurements such as:

- Temperature
- pH
- Dissolved oxygen
- Ammonia
- Nitrite
- Nitrate
- Salinity
- Turbidity
- Alkalinity
- EC

This allows the farm to maintain historical records and identify changes over time.

### Fish Health & Sampling

The system supports health sample documentation, including:

- Date
- Pond / tank
- Findings
- Diagnosis
- Treatment recommendation
- Treatment date
- Responsible person
- Status
- Notes
- Image support where configured

### Treatments

Users can document and manage treatments that were applied in the farm, including:

- Treatment name
- Active substance
- Dosage
- Date
- Status
- Responsible person
- Notes

### Alerts

The system is designed to support alert visibility for abnormal or critical measurements and help users identify issues that require attention.

### Admin and Reference Data

Administrative users can manage reference entities such as:

- Departments
- Treatment presets
- Systems
- Other configurable records required for farm operation

---

## 3. Why This System Matters

Fish farm operations require accurate, timely, and structured information.

Without a system like Phoenix Farm, staff often depend on manual communication, spreadsheets, and disconnected records. That creates risks such as:

- Missing or inconsistent data
- Delayed response to health or water quality issues
- Poor traceability
- Duplicate work
- Reduced visibility across the farm

Phoenix Farm helps reduce those risks by making the system:

- Centralized
- Structured
- Easier to maintain
- Easier to use across devices
- More transparent for future users and maintainers

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

frontend/ Contains the client-side application backend/ Contains the API server, Prisma schema, routes, authentication logic, and database integration render.yaml Deployment-related configuration file README.md This documentation file

Code

---

## 6. Public Links

### Frontend

The public system URL is:

https://phoenix-farm-frontend.onrender.com/

Code

### Backend

The backend is deployed separately on Render and exposes API routes and a health endpoint.

A working backend health check should return JSON at:

https://<your-backend-service>.onrender.com/health

Code

Example response:

```json
{"ok": true, "time": "2026-04-13T14:52:25.715Z"}
```
Note: Opening the backend root URL (/) may return "Cannot GET /". This is normal if no homepage route is defined. The backend is an API service, not a website.

7. First-Time Local Setup
This section explains how to run the system for the first time on a local machine.

Step 1 — Clone the repository
bash
git clone https://github.com/anogshtorper-dev/Phoenix-Farm.git
cd Phoenix-Farm
Step 2 — Create environment files
Backend
Create: backend/.env

Example:

env
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
Create: frontend/.env.local

Example:

env
VITE_API_URL=http://localhost:3001/api
Step 3 — Install backend dependencies
bash
cd backend
npm install
Step 4 — Generate Prisma client
bash
npx prisma generate
Step 5 — Run database migrations
bash
npx prisma migrate dev --name init
Step 6 — Seed the database
bash
npm run seed
Step 7 — Start the backend
bash
npm run dev
The backend health check should now work at:

```Code
http://localhost:3001/health
```
Step 8 — Install frontend dependencies
Open another terminal:

```bash
cd frontend
npm install
Step 9 — Start the frontend
bash
npm run dev
```
The frontend should run locally at:

```Code
http://localhost:5173
```
8. Default Login Credentials
If the seed was executed successfully, the following demo users should exist:

```Admin User
Email: admin@phoenixfarm.com
Password: admin123
```
```Worker User
Email: worker@phoenixfarm.com
Password: user123
```
If these credentials do not work, the seed was probably not executed against the correct database.

9. Deployment Architecture
Phoenix Farm is deployed using two main external services:

```Render
Used to host:

The backend API
The frontend static site
```
```Neon
Used to host:

The PostgreSQL database
```
This means the application is split into:

Frontend service
Backend service
Hosted database

10. Render Maintenance Guide
Render is the platform used to deploy and manage the live application.

What can be managed from the Render dashboard
From the Render dashboard you can:

See whether each service is live
View build logs
View runtime logs
Redeploy services manually
Restart services
Update environment variables
Inspect public URLs
Connect deployments to GitHub pushes
Backend configuration on Render
Recommended backend service setup:

Service type: Web Service
Root Directory: backend
Build Command: npm install && npm run prisma:generate && npm run prisma:deploy
Start Command: npm start
Frontend configuration on Render
Recommended frontend service setup:

Service type: Static Site
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
Important note about free / low-usage environments
Render services may take longer to respond after inactivity, especially on lower-cost plans. The first request after a long idle period may feel slower than usual.

When to redeploy Render
A redeploy is usually needed when:

Code was changed in GitHub
Environment variables were changed
A build failed and must be retried
A service became unstable and needs a restart
Recommended routine checks in Render
At least occasionally, verify:

The backend service is live
The frontend service is live
The backend /health endpoint responds
Logs do not show repeated runtime errors
The latest deploy completed successfully

11. Neon Maintenance Guide
Neon hosts the PostgreSQL database used by the system.

What can be managed from the Neon dashboard
From the Neon dashboard you can:

Access the database project
Copy the connection string
Manage branches
Review database status
Monitor database activity
Create or manage roles and databases
What Neon is used for in this project
Neon stores:

Users
Ponds
Systems
Water quality measurements
Health samples
Treatments
Alerts
Admin configuration data
Audit-related records
Important operational note
The live application depends on the Neon database connection string being correctly configured in Render as DATABASE_URL.

If DATABASE_URL is wrong or missing:

The backend may fail to start
Prisma migrations may fail
Login may fail
Seeded users may not exist where expected
Recommended routine checks in Neon
Occasionally verify:

The project is active
The correct database is being used
The connection string matches the one configured in Render
No unexpected database branch or environment mismatch exists

12. Required Environment Variables
Backend
Required or commonly used variables:

```Code
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
ADMIN_REGISTER_SECRET=
NODE_ENV=production
ALLOWED_ORIGINS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
Frontend
```Code
VITE_API_URL=
Example production values
```
Backend
```env
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d
ADMIN_REGISTER_SECRET=another-secret
NODE_ENV=production
ALLOWED_ORIGINS=https://phoenix-farm-frontend.onrender.com
```
Frontend
```env
VITE_API_URL=https://<your-backend-service>.onrender.com/api
```

13. Common Troubleshooting
14. 
1. Frontend opens, but API actions fail
Possible causes:

VITE_API_URL is wrong
Backend is down
ALLOWED_ORIGINS does not include the frontend URL
CORS issue
Backend environment variables are missing
2. Backend root URL shows "Cannot GET /"
This is normal if no route exists for /. Use /health to verify the backend instead.

3. Login does not work
Possible causes:

Database seed was not executed
DATABASE_URL points to the wrong database
Backend cannot reach Neon
Incorrect credentials are being used

4. Frontend works locally but not from another device
Possible causes:

Trying to open localhost from another device
Backend ALLOWED_ORIGINS does not include the deployed frontend URL
Frontend VITE_API_URL still points to local backend
Mobile browser or network issue

5. Render build fails with "prisma: Permission denied"
Recommended fix:

Run Prisma through npm scripts or node, not through a broken executable path
Ensure the backend build command uses the project's working scripts

6. Render build fails with "vite: Permission denied"
Possible causes:

node_modules or build artifacts were committed to GitHub
The repository included files generated on another operating system
Recommended fix:

Ensure .gitignore excludes node_modules/
Remove tracked node_modules
Redeploy

7. npm install hangs or times out locally
Possible causes:

Wrong npm registry
Proxy / VPN / DNS issues
Windows-specific environment or networking problems
Recommended checks:

bash
```npm config get registry
npm ping
Recommended registry:
```
```Code
https://registry.npmjs.org/
```

8. Health check fails
If /health does not return a valid response:

Backend service may be down
Backend start command may be wrong
Environment variables may be missing
Neon connection may be failing

9. Seed users do not exist in production
Possible causes:

Migrations ran successfully, but seed was never executed on the production database
The application is connected to a different Neon database than expected
Recommended checks:

Verify the DATABASE_URL in Render
Verify that the expected users exist in the connected Neon database
Run the seed manually if necessary


14. Ongoing Operational Transparency
This project is intended to remain understandable and maintainable even for someone who did not originally build it.

To keep the system transparent over time:

Always document environment variable changes
Keep deployment settings consistent between local and production environments
Avoid hardcoding secrets in code
Do not commit .env files
Do not commit node_modules
Test login and /health after every important deployment
Keep README updated when the architecture changes
Record any future admin credentials or onboarding changes in a secure internal note


15. Recommended Post-Deployment Checks
After any important deployment, verify the following:

Backend /health endpoint returns success
Frontend URL loads successfully
Login works
One or more main screens load correctly
No critical frontend console errors are visible
No repeated backend runtime errors appear in Render logs
Data can be read from Neon-backed records


16. Security and Good Practices
To keep the system secure and maintainable:

Keep secrets only in environment variables
Never store production secrets in GitHub
Use private repositories when appropriate
Rotate secrets if they were ever exposed
Restrict admin credentials and share them only with authorized users
Review Render and Neon configuration after major changes


17. Suggested Future Improvements
Possible future improvements include:

Stronger role-based access control
Audit trail expansion
Richer alert logic and threshold management
Historical dashboards and trend analysis
Improved mobile responsiveness
Image upload hardening and file validation
Automated backup and restore documentation
Onboarding documentation for non-technical users


18. Support and Ownership
If future users or maintainers need to troubleshoot the system, the first places to inspect are:

Render backend logs
Render frontend deploy logs
Neon connection configuration
Environment variables
Prisma migration / seed status
This README should be kept updated whenever:

Deployment settings change
Environment variables change
System modules are added or removed
Login behavior changes
Infrastructure is replaced or extended


19. Quick Operational Checklist
Use this short checklist whenever the system is updated or handed over:

 Verify backend /health
 Verify frontend loads
 Verify login works
 Verify Render services are live
 Verify Neon database is the expected one
 Verify ALLOWED_ORIGINS matches the frontend URL
 Verify VITE_API_URL matches the backend URL
 Verify secrets are not committed to GitHub
Last Updated: 2026-04-13
