const { createCrudRouter } = require('../lib/crudFactory');
const { requireAuth, requireAdmin } = require('../middleware/auth');
module.exports = createCrudRouter('pondGroup', {
  entityType: 'PondGroup', orderBy: { name: 'asc' },
  searchFields: ['name'], filterFields: ['isActive'],
  authMiddleware: requireAuth, adminMiddleware: requireAdmin,
});
