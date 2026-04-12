// src/lib/crudFactory.js
// Generates standard CRUD routes for a Prisma model to reduce boilerplate.
const { logAudit } = require('./audit');

/**
 * createCrudRouter(model, options)
 * model     – prisma model name e.g. "pond"
 * options:
 *   entityType  – audit label
 *   orderBy     – default sort e.g. { name: 'asc' }
 *   searchFields – array of string field names for ?search= param
 *   filterFields – fields that can be filtered via ?field=value
 *   requireAdminWrite – if true, POST/PUT/DELETE require admin role
 *   middleware  – array of middleware to apply to all routes
 */
function createCrudRouter(modelName, {
  entityType,
  orderBy = { createdAt: 'asc' },
  searchFields = [],
  filterFields = [],
  requireAdminWrite = false,
  authMiddleware,
  adminMiddleware,
} = {}) {
  const router = require('express').Router();
  const prisma = require('./prisma');
  const model = prisma[modelName];

  // All routes require auth
  router.use(authMiddleware);

  const writeGuard = requireAdminWrite ? [adminMiddleware] : [];

  // GET /  – list with optional ?search= and filter params
  router.get('/', async (req, res, next) => {
    try {
      const where = {};

      // Filter by exact field values from query string
      filterFields.forEach(f => {
        if (req.query[f] !== undefined) {
          // Handle boolean coercion
          let val = req.query[f];
          if (val === 'true') val = true;
          if (val === 'false') val = false;
          where[f] = val;
        }
      });

      // Full-text search across searchFields
      if (req.query.search && searchFields.length) {
        where.OR = searchFields.map(f => ({
          [f]: { contains: req.query.search, mode: 'insensitive' },
        }));
      }

      const items = await model.findMany({ where, orderBy });
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // GET /:id
  router.get('/:id', async (req, res, next) => {
    try {
      const item = await model.findUnique({ where: { id: req.params.id } });
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // POST /
  router.post('/', ...writeGuard, async (req, res, next) => {
    try {
      const item = await model.create({ data: req.body });
      await logAudit({ req, entityType: entityType || modelName, entityId: item.id, action: 'create', after: item });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  // PUT /:id
  router.put('/:id', ...writeGuard, async (req, res, next) => {
    try {
      const before = await model.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: 'Not found' });
      const item = await model.update({ where: { id: req.params.id }, data: req.body });
      await logAudit({ req, entityType: entityType || modelName, entityId: item.id, action: 'update', before, after: item });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /:id
  router.delete('/:id', ...writeGuard, async (req, res, next) => {
    try {
      const before = await model.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: 'Not found' });
      await model.delete({ where: { id: req.params.id } });
      await logAudit({ req, entityType: entityType || modelName, entityId: req.params.id, action: 'delete', before });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createCrudRouter };
