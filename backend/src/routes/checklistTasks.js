const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const DEFAULT_TASKS = [
  { key: 'sandFilter', label: 'Sand Filter', type: 'ok_notok', sortOrder: 10 },
  { key: 'ozoneMixingTank', label: 'Ozone Mixing Tank', type: 'ok_notok', sortOrder: 20 },
  { key: 'bufferTank', label: 'Buffer Tank', type: 'full_empty', sortOrder: 30 },
  { key: 'tricklingFilterTowers', label: 'Trickling Filter Towers', type: 'ok_notok', sortOrder: 40 },
  { key: 'hydrocyclone', label: 'Hydrocyclone', type: 'ok_notok', sortOrder: 50 },
  { key: 'ozon', label: 'Ozon', type: 'ok_notok_with_power', sortOrder: 60 },
  { key: 'hydrocycloneScreen', label: 'Hydrocyclone Screen', type: 'ok_notok', sortOrder: 70 },
  { key: 'sandFilterScreen', label: 'Sand Filter Screen', type: 'ok_notok', sortOrder: 80 },
];

async function ensureDefaultTasks() {
  const count = await prisma.checklistTask.count();
  if (count > 0) return;
  await prisma.checklistTask.createMany({ data: DEFAULT_TASKS, skipDuplicates: true });
}

function makeKey(label) {
  return String(label || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    await ensureDefaultTasks();
    const where = {};
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';
    const items = await prisma.checklistTask.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const label = String(req.body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Label is required' });
    const item = await prisma.checklistTask.create({
      data: {
        key: req.body.key || makeKey(label),
        label,
        type: req.body.type || 'ok_notok',
        sortOrder: Number(req.body.sortOrder ?? 999),
        isActive: req.body.isActive !== false,
      },
    });
    await logAudit({ req, entityType: 'ChecklistTask', entityId: item.id, action: 'create', after: item });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.checklistTask.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.checklistTask.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.label !== undefined && { label: String(req.body.label).trim() }),
        ...(req.body.type !== undefined && { type: req.body.type }),
        ...(req.body.sortOrder !== undefined && { sortOrder: Number(req.body.sortOrder) }),
        ...(req.body.isActive !== undefined && { isActive: Boolean(req.body.isActive) }),
      },
    });
    await logAudit({ req, entityType: 'ChecklistTask', entityId: item.id, action: 'update', before, after: item });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.checklistTask.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.checklistTask.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAudit({ req, entityType: 'ChecklistTask', entityId: item.id, action: 'disable', before, after: item });
    res.json(item);
  } catch (err) { next(err); }
});

module.exports = router;
