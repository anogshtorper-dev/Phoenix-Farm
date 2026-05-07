const { createCrudRouter } = require('../lib/crudFactory');
const { requireAuth, requireAdmin } = require('../middleware/auth');
module.exports = createCrudRouter('treatmentPreset', {
  entityType: 'TreatmentPreset', orderBy: { name: 'asc' },
  searchFields: ['name'], filterFields: ['isActive'],
  authMiddleware: requireAuth, adminMiddleware: requireAdmin,
});
