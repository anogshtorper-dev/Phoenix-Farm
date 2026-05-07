// src/lib/crudRouter.js
// A tiny factory that generates standard CRUD routes for a Prisma model.
// Usage:
//   const router = crudRouter(prisma.pond, { authenticate, audit: 'Pond' });
//   module.exports = router;

const express = require('express');
const prisma = require('./prisma');
const { authenticate } = require('../middleware/auth');

/**
 * @param {object} model          – Prisma model delegate (e.g. prisma.pond)
 * @param {object} opts
 *   @param {string}  opts.entityName – name used in audit records
 *   @param {boolean} opts.open       – skip auth if true (default false)
 */
function crudRouter(model, opts = {}) {
  const router = express.Router();
  const { entityName, open = false } = opts;

  const guard = open ? (req, res, next) => next() : authenticate;

  const writeAudit = async (action, userId, performedBy, entityId, before, after, systemId) => {
    if (!entityName) return;
    try {
      await prisma.auditHistory.create({
        data: {
          entityType: entityName,
          entityId: String(entityId),
          action,
          description: `${action} ${entityName}`,
          performedBy,
          userId,
          before: before || undefined,
          after: after || undefined,
          systemId: systemId || undefined,
        },
      });
    } catch (_) { /* audit failures must not break the main request */ }
  };

  // LIST  GET /
  router.get('/', guard, async (req, res, next) => {
    try {
      // Support simple equality filters via query params (e.g. ?isActive=true&systemId=xyz)
      const where = {};
      for (const [k, v] of Object.entries(req.query)) {
        if (k === 'limit' || k === 'skip' || k === 'orderBy') continue;
        if (v === 'true')  { where[k] = true;  continue; }
        if (v === 'false') { where[k] = false; continue; }
        where[k] = v;
      }
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const skip  = req.query.skip  ? parseInt(req.query.skip)  : undefined;
      const rows = await model.findMany({ where, take: limit, skip, orderBy: { createdAt: 'desc' } });
      res.json(rows);
    } catch (err) { next(err); }
  });

  // GET ONE  GET /:id
  router.get('/:id', guard, async (req, res, next) => {
    try {
      const row = await model.findUnique({ where: { id: req.params.id } });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) { next(err); }
  });

  // CREATE  POST /
  router.post('/', guard, async (req, res, next) => {
    try {
      const row = await model.create({ data: req.body });
      await writeAudit('create', req.user?.id, req.user?.fullName, row.id, null, row, req.body.systemId);
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

  // UPDATE  PATCH /:id
  router.patch('/:id', guard, async (req, res, next) => {
    try {
      const before = await model.findUnique({ where: { id: req.params.id } });
      const row = await model.update({ where: { id: req.params.id }, data: req.body });
      await writeAudit('update', req.user?.id, req.user?.fullName, row.id, before, row, req.body.systemId || before?.systemId);
      res.json(row);
    } catch (err) { next(err); }
  });

  // DELETE  DELETE /:id
  router.delete('/:id', guard, async (req, res, next) => {
    try {
      const before = await model.findUnique({ where: { id: req.params.id } });
      await model.delete({ where: { id: req.params.id } });
      await writeAudit('delete', req.user?.id, req.user?.fullName, req.params.id, before, null);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = crudRouter;
