// src/routes/healthSamples.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.pondId) where.pondId = req.query.pondId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) where.date.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.date.lte = new Date(req.query.dateTo);
    }
    const items = await prisma.healthSample.findMany({ where, orderBy: { date: 'desc' } });
    res.json(items);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.healthSample.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    if (data.treatmentDate) data.treatmentDate = new Date(data.treatmentDate);
    const item = await prisma.healthSample.create({ data });
    await logAudit({ req, entityType: 'HealthSample', entityId: item.id, action: 'create', after: item });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    if (data.treatmentDate) data.treatmentDate = new Date(data.treatmentDate);
    const before = await prisma.healthSample.findUnique({ where: { id: req.params.id } });
    const item = await prisma.healthSample.update({ where: { id: req.params.id }, data });
    await logAudit({ req, entityType: 'HealthSample', entityId: item.id, action: 'update', before, after: item });
    res.json(item);
  } catch (err) { next(err); }
});

// PATCH /:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const before = await prisma.healthSample.findUnique({ where: { id: req.params.id } });
    const item = await prisma.healthSample.update({ where: { id: req.params.id }, data: { status } });
    await logAudit({ req, entityType: 'HealthSample', entityId: item.id, action: 'status_change',
      description: `Status changed from ${before.status} to ${status}`, before, after: item });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const before = await prisma.healthSample.findUnique({ where: { id: req.params.id } });
    await prisma.healthSample.delete({ where: { id: req.params.id } });
    await logAudit({ req, entityType: 'HealthSample', entityId: req.params.id, action: 'delete', before });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
