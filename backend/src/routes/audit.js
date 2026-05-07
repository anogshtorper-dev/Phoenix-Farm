// src/routes/audit.js
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.entityId) where.entityId = req.query.entityId;
    if (req.query.action) where.action = req.query.action;
    if (req.query.performedBy) where.performedBy = { contains: req.query.performedBy, mode: 'insensitive' };
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo);
    }
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    const items = await prisma.auditHistory.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
    });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await prisma.auditHistory.create({
      data: { ...req.body, userId: req.user.id, performedBy: req.user.fullName },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const item = await prisma.auditHistory.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});

module.exports = router;
