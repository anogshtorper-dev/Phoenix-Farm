// src/routes/waterQuality.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.systemId) where.systemId = req.query.systemId;
    if (req.query.pondId) where.pondId = req.query.pondId;
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) where.date.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.date.lte = new Date(req.query.dateTo);
    }
    const items = await prisma.waterQualityMeasurement.findMany({
      where, orderBy: { date: 'desc' }, take: req.query.limit ? parseInt(req.query.limit) : undefined,
    });
    res.json(items);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.waterQualityMeasurement.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user.fullName };
    if (data.date) data.date = new Date(data.date);
    const item = await prisma.waterQualityMeasurement.create({ data });
    await logAudit({ req, entityType: 'WaterQualityMeasurement', entityId: item.id, action: 'create', after: item, systemId: item.systemId });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const item = await prisma.waterQualityMeasurement.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.waterQualityMeasurement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
