// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const pondsRoutes = require('./routes/ponds');
const systemsRoutes = require('./routes/systems');
const departmentsRoutes = require('./routes/departments');
const speciesRoutes = require('./routes/species');
const linesRoutes = require('./routes/lines');
const pondGroupsRoutes = require('./routes/pondGroups');
const fishBatchesRoutes = require('./routes/fishBatches');
const healthSamplesRoutes = require('./routes/healthSamples');
const treatmentsRoutes = require('./routes/treatments');
const waterQualityRoutes = require('./routes/waterQuality');
const alertsRoutes = require('./routes/alerts');
const spawningRoutes = require('./routes/spawning');
const auditRoutes = require('./routes/audit');
const treatmentPresetsRoutes = require('./routes/treatmentPresets');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── BODY PARSING ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

// ─── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/ponds', pondsRoutes);
app.use('/api/systems', systemsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/lines', linesRoutes);
app.use('/api/pond-groups', pondGroupsRoutes);
app.use('/api/fish-batches', fishBatchesRoutes);
app.use('/api/health-samples', healthSamplesRoutes);
app.use('/api/treatments', treatmentsRoutes);
app.use('/api/water-quality', waterQualityRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/spawning', spawningRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/treatment-presets', treatmentPresetsRoutes);
app.use('/api/upload', uploadRoutes);

// ─── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Phoenix Farm API running on port ${PORT}`);
});
