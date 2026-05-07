// src/routes/alerts.js
// Kept only for MetricAcknowledgment, which is still used inside active pond/metric screens.
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

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

module.exports = router;
