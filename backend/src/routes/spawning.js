// src/routes/spawning.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive !== 'false';
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) where.date.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.date.lte = new Date(req.query.dateTo);
    }
    const items = await prisma.spawningSystem.findMany({ where, orderBy: { date: 'desc' } });
    res.json(items);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.spawningSystem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body, createdByName: req.user.fullName };
    if (data.date) data.date = new Date(data.date);
    const item = await prisma.spawningSystem.create({ data });
    await logAudit({ req, entityType: 'SpawningSystem', entityId: item.id, action: 'create', after: item });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const item = await prisma.spawningSystem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.spawningSystem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
