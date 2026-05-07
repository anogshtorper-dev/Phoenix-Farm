export function normalizeDepartmentName(name = '') {
  return String(name).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

export function getOutdatedThresholdDays(departmentName) {
  const normalized = normalizeDepartmentName(departmentName);
  if (normalized.includes('grow out') || normalized.includes('growout')) return 60;
  if (normalized.includes('nursery')) return 30;
  if (normalized.includes('breeding') || normalized.includes('breed')) return 90;
  return 30;
}

export function isPondOutdatedByDepartment(pond, departments = []) {
  if (!pond?.lastUpdated) return true;
  const department = departments.find((d) => d.id === pond.departmentId);
  const thresholdDays = getOutdatedThresholdDays(department?.name);
  const daysSinceUpdate = (Date.now() - new Date(pond.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate > thresholdDays;
}

export function getDepartmentThresholdLabel() {
  return 'Grow Out: 60 days, Nursery: 30 days, Breeding: 90 days';
}
