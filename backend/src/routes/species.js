const { createCrudRouter } = require('../lib/crudFactory');
const { requireAuth, requireAdmin } = require('../middleware/auth');
module.exports = createCrudRouter('species', {
  entityType: 'Species', orderBy: { name: 'asc' },
  searchFields: ['name'], filterFields: ['isActive'],
  authMiddleware: requireAuth, adminMiddleware: requireAdmin,
});
