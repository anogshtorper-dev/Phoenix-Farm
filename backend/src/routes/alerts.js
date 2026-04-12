// src/routes/alerts.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Metric acknowledgments
router.get('/acknowledgments', async (req, res, next) => {
  try {
    const items = await prisma.metricAcknowledgment.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/acknowledgments', async (req, res, next) => {
  try {
    const item = await prisma.metricAcknowledgment.create({
      data: { ...req.body, acknowledgedBy: req.user.fullName },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.delete('/acknowledgments/:id', async (req, res, next) => {
  try {
    await prisma.metricAcknowledgment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Alert records
router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.isResolved !== undefined) where.isResolved = req.query.isResolved === 'true';
    const items = await prisma.alertRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await prisma.alertRecord.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const item = await prisma.alertRecord.update({
      where: { id: req.params.id },
      data: { isResolved: true, resolvedAt: new Date() },
    });
    res.json(item);
  } catch (err) { next(err); }
});

module.exports = router;
