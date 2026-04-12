// src/lib/utils-compat.js
// createPageUrl shim – maps old Base44 page names to new routes.
// Import this in any file that still calls createPageUrl().
const PAGE_ROUTES = {
  Home:                    '/',
  Dashboard:               '/dashboard',
  Alerts:                  '/alerts',
  WaterQuality:            '/water-quality',
  Reports:                 '/reports',
  HistoryLog:              '/history',
  TreatmentCalculator:     '/calculator',
  SystemsChecklist:        '/checklist',
  HealthTreatments:        '/health',
  SpawningSystemTracking:  '/spawning',
  GroupView:               '/group-view',
  Admin:                   '/admin',
  Login:                   '/login',
};

export function createPageUrl(pageName) {
  return PAGE_ROUTES[pageName] || '/';
}
