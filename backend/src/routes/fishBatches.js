// src/routes/fishBatches.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive !== 'false';
    if (req.query.currentTankId) where.currentTankId = req.query.currentTankId;
    const batches = await prisma.fishBatch.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(batches);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const b = await prisma.fishBatch.findUnique({ where: { id: req.params.id } });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const batch = await prisma.fishBatch.create({ data: req.body });
    await logAudit({ req, entityType: 'FishBatch', entityId: batch.id, action: 'create', after: batch });
    res.status(201).json(batch);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const before = await prisma.fishBatch.findUnique({ where: { id: req.params.id } });
    const batch = await prisma.fishBatch.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ req, entityType: 'FishBatch', entityId: batch.id, action: 'update', before, after: batch });
    res.json(batch);
  } catch (err) { next(err); }
});

// POST /:id/transfer  – move batch to another tank
router.post('/:id/transfer', async (req, res, next) => {
  try {
    const { toTankId, note } = req.body;
    const before = await prisma.fishBatch.findUnique({ where: { id: req.params.id } });
    const batch = await prisma.fishBatch.update({
      where: { id: req.params.id },
      data: { currentTankId: toTankId },
    });
    await logAudit({
      req, entityType: 'FishBatch', entityId: batch.id, action: 'transfer',
      description: `Transferred from tank ${before.currentTankId} to ${toTankId}${note ? ': ' + note : ''}`,
      before, after: batch,
    });
    res.json(batch);
  } catch (err) { next(err); }
});

// POST /:id/pull  – deactivate batch (pulled from pond)
router.post('/:id/pull', async (req, res, next) => {
  try {
    const before = await prisma.fishBatch.findUnique({ where: { id: req.params.id } });
    const batch = await prisma.fishBatch.update({
      where: { id: req.params.id },
      data: { isActive: false, currentTankId: null, ...req.body },
    });
    await logAudit({ req, entityType: 'FishBatch', entityId: batch.id, action: 'pull', before, after: batch });
    res.json(batch);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.fishBatch.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
