const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.waterQualityValidRange.findMany({
      where: req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {},
      orderBy: { parameterName: 'asc' },
    });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const parameterName = String(req.body.parameterName || '').trim();
    const minValue = Number(req.body.minValue);
    const maxValue = Number(req.body.maxValue);
    if (!parameterName) return res.status(400).json({ error: 'Parameter name is required' });
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return res.status(400).json({ error: 'Min and max must be valid numbers' });
    if (minValue >= maxValue) return res.status(400).json({ error: 'Min must be lower than max' });
    const item = await prisma.waterQualityValidRange.create({ data: { parameterName, minValue, maxValue, isActive: req.body.isActive !== false } });
    await logAudit({ req, entityType: 'WaterQualityValidRange', entityId: item.id, action: 'create', after: item });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.waterQualityValidRange.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    const minValue = req.body.minValue !== undefined ? Number(req.body.minValue) : before.minValue;
    const maxValue = req.body.maxValue !== undefined ? Number(req.body.maxValue) : before.maxValue;
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return res.status(400).json({ error: 'Min and max must be valid numbers' });
    if (minValue >= maxValue) return res.status(400).json({ error: 'Min must be lower than max' });
    const item = await prisma.waterQualityValidRange.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.parameterName !== undefined && { parameterName: String(req.body.parameterName).trim() }),
        minValue,
        maxValue,
        ...(req.body.isActive !== undefined && { isActive: Boolean(req.body.isActive) }),
      },
    });
    await logAudit({ req, entityType: 'WaterQualityValidRange', entityId: item.id, action: 'update', before, after: item });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.waterQualityValidRange.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    await prisma.waterQualityValidRange.delete({ where: { id: req.params.id } });
    await logAudit({ req, entityType: 'WaterQualityValidRange', entityId: req.params.id, action: 'delete', before });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
