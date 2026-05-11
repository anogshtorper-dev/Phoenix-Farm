const router  = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

router.use(requireAuth);

// Enrich lines with speciesName from the related Species record
async function enrichLines(lines) {
  if (!lines.length) return lines;
  const speciesIds = [...new Set(lines.map(l => l.speciesId).filter(Boolean))];
  const speciesList = speciesIds.length
    ? await prisma.species.findMany({ where: { id: { in: speciesIds } } })
    : [];
  const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s.name]));
  return lines.map(l => ({ ...l, speciesName: l.speciesId ? (speciesMap[l.speciesId] || null) : null }));
}

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive !== 'false';
    if (req.query.search) where.name = { contains: req.query.search, mode: 'insensitive' };
    const lines = await prisma.line.findMany({ where, orderBy: { name: 'asc' } });
    res.json(await enrichLines(lines));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const line = await prisma.line.findUnique({ where: { id: req.params.id } });
    if (!line) return res.status(404).json({ error: 'Not found' });
    res.json((await enrichLines([line]))[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const line = await prisma.line.create({ data: req.body });
    await logAudit({ req, entityType: 'Line', entityId: line.id, action: 'create', after: line });
    res.status(201).json((await enrichLines([line]))[0]);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.line.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    const line = await prisma.line.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ req, entityType: 'Line', entityId: line.id, action: 'update', before, after: line });
    res.json((await enrichLines([line]))[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.line.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    await prisma.line.delete({ where: { id: req.params.id } });
    await logAudit({ req, entityType: 'Line', entityId: req.params.id, action: 'delete', before });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
