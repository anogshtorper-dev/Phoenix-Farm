// src/lib/audit.js
// Helper to write audit history records from any route handler
const prisma = require('./prisma');

/**
 * logAudit({ req, entityType, entityId, action, description, before, after, systemId })
 * req is optional – used to extract performedBy / userId from req.user
 */
async function logAudit({ req, entityType, entityId, action, description, before, after, systemId }) {
  try {
    await prisma.auditHistory.create({
      data: {
        entityType,
        entityId: entityId ? String(entityId) : null,
        action,
        description: description || null,
        performedBy: req?.user?.fullName || req?.user?.email || null,
        userId: req?.user?.id || null,
        before: before || null,
        after: after || null,
        systemId: systemId || null,
      },
    });
  } catch (e) {
    // Never crash the main request over an audit failure
    console.error('Audit log failed:', e.message);
  }
}

module.exports = { logAudit };
