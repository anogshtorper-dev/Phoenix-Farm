// src/routes/systems.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';
    const systems = await prisma.rASSystem.findMany({ where, orderBy: { sortOrder: 'asc' } });
    res.json(systems);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const s = await prisma.rASSystem.findUnique({ where: { id: req.params.id } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const s = await prisma.rASSystem.create({ data: req.body });
    await logAudit({ req, entityType: 'RASSystem', entityId: s.id, action: 'create', after: s });
    res.status(201).json(s);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.rASSystem.findUnique({ where: { id: req.params.id } });
    const s = await prisma.rASSystem.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ req, entityType: 'RASSystem', entityId: s.id, action: 'update', before, after: s });
    res.json(s);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.rASSystem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
