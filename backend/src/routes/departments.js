const { createCrudRouter } = require('../lib/crudFactory');
const { requireAuth, requireAdmin } = require('../middleware/auth');
module.exports = createCrudRouter('department', {
  entityType: 'Department', orderBy: { name: 'asc' },
  searchFields: ['name'], filterFields: ['isActive'],
  authMiddleware: requireAuth, adminMiddleware: requireAdmin,
});
