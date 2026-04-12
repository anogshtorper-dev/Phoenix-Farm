// src/routes/ponds.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

// GET /api/ponds  – supports ?systemId= ?isActive= ?tankStatus=
router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.systemId) where.systemId = req.query.systemId;
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive !== 'false';
    if (req.query.tankStatus) where.tankStatus = req.query.tankStatus;

    const ponds = await prisma.pond.findMany({
      where,
      orderBy: { number: 'asc' },
    });
    res.json(ponds);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pond = await prisma.pond.findUnique({ where: { id: req.params.id } });
    if (!pond) return res.status(404).json({ error: 'Not found' });
    res.json(pond);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const pond = await prisma.pond.create({ data: req.body });
    await logAudit({ req, entityType: 'Pond', entityId: pond.id, action: 'create', after: pond, systemId: pond.systemId });
    res.status(201).json(pond);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const before = await prisma.pond.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    const pond = await prisma.pond.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ req, entityType: 'Pond', entityId: pond.id, action: 'update', before, after: pond, systemId: pond.systemId });
    res.json(pond);
  } catch (err) { next(err); }
});

// PATCH /:id/metrics  – lightweight endpoint for bulk metric updates (SystemMetricsModal)
router.patch('/:id/metrics', async (req, res, next) => {
  try {
    const { temperature, ph, ec, do: doVal, alkalinity, ammonia, nitrite, nitrate, salinity, turbidity } = req.body;
    const data = {
      lastUpdated: new Date(),
      ...(temperature !== undefined && { temperature: parseFloat(temperature) }),
      ...(ph !== undefined && { ph: parseFloat(ph) }),
      ...(ec !== undefined && { ec: parseFloat(ec) }),
      ...(doVal !== undefined && { do: parseFloat(doVal) }),
      ...(alkalinity !== undefined && { alkalinity: parseFloat(alkalinity) }),
      ...(ammonia !== undefined && { ammonia: parseFloat(ammonia) }),
      ...(nitrite !== undefined && { nitrite: parseFloat(nitrite) }),
      ...(nitrate !== undefined && { nitrate: parseFloat(nitrate) }),
      ...(salinity !== undefined && { salinity: parseFloat(salinity) }),
      ...(turbidity !== undefined && { turbidity: parseFloat(turbidity) }),
    };
    const pond = await prisma.pond.update({ where: { id: req.params.id }, data });
    res.json(pond);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.pond.findUnique({ where: { id: req.params.id } });
    await prisma.pond.delete({ where: { id: req.params.id } });
    await logAudit({ req, entityType: 'Pond', entityId: req.params.id, action: 'delete', before });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
