const { createCrudRouter } = require('../lib/crudFactory');
const { requireAuth, requireAdmin } = require('../middleware/auth');
module.exports = createCrudRouter('line', {
  entityType: 'Line', orderBy: { name: 'asc' },
  searchFields: ['name'], filterFields: ['isActive'],
  authMiddleware: requireAuth, adminMiddleware: requireAdmin,
});
