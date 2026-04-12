// src/api/index.js
// Single import point for all API modules.
// Usage: import { Pond, FishBatch, RASSystem } from '@/api'
import { createEntityApi } from './entityFactory';
import client from './client';

export { authApi } from './auth';
export { default as apiClient } from './client';

// ── Core entities ──────────────────────────────────────────────────────────
export const RASSystem  = createEntityApi('/systems');
export const Pond       = createEntityApi('/ponds');
export const Department = createEntityApi('/departments');
export const PondGroup  = createEntityApi('/pond-groups');
export const Species    = createEntityApi('/species');
export const Line       = createEntityApi('/lines');
export const FishBatch  = createEntityApi('/fish-batches');

// ── Health ─────────────────────────────────────────────────────────────────
export const HealthSample = {
  ...createEntityApi('/health-samples'),
  setStatus: (id, status) => client.patch(`/health-samples/${id}/status`, { status }),
};

export const Treatment = {
  ...createEntityApi('/treatments'),
  setStatus: (id, status) => client.patch(`/treatments/${id}/status`, { status }),
};

export const TreatmentPreset = createEntityApi('/treatment-presets');

// ── Water quality ──────────────────────────────────────────────────────────
export const WaterQualityMeasurement = createEntityApi('/water-quality');

// ── Alerts ─────────────────────────────────────────────────────────────────
export const AlertRecord = createEntityApi('/alerts');
export const MetricAcknowledgment = {
  ...createEntityApi('/alerts/acknowledgments'),
  list: (params) => client.get('/alerts/acknowledgments', { params }),
  filter: (params) => client.get('/alerts/acknowledgments', { params }),
  create: (data) => client.post('/alerts/acknowledgments', data),
  delete: (id) => client.delete(`/alerts/acknowledgments/${id}`),
};

// ── Spawning ───────────────────────────────────────────────────────────────
export const SpawningSystem = createEntityApi('/spawning');

// ── Audit ──────────────────────────────────────────────────────────────────
export const AuditHistory = {
  ...createEntityApi('/audit'),
  list: (params) => client.get('/audit', { params }),
  filter: (params) => client.get('/audit', { params }),
};

// ── Ponds extras ───────────────────────────────────────────────────────────
export const PondMetrics = {
  update: (pondId, metrics) => client.patch(`/ponds/${pondId}/metrics`, metrics),
};

// ── Fish batch actions ─────────────────────────────────────────────────────
export const FishBatchActions = {
  transfer: (id, toTankId, note) => client.post(`/fish-batches/${id}/transfer`, { toTankId, note }),
  pull: (id, data) => client.post(`/fish-batches/${id}/pull`, data),
};

// ── File upload ────────────────────────────────────────────────────────────
export const UploadFile = async ({ file }) => {
  const formData = new FormData();
  formData.append('file', file);
  const result = await client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { file_url: result.file_url };
};

// ── Compatibility shim: Query (was base44.entities.Query) ──────────────────
// Used in some reports. Replace with direct entity calls as needed.
export const Query = {
  run: (entityName, params) => {
    const map = { RASSystem, Pond, Department, PondGroup, FishBatch, HealthSample,
                  Treatment, WaterQualityMeasurement, AuditHistory, SpawningSystem };
    const api = map[entityName];
    return api ? api.filter(params) : Promise.resolve([]);
  },
};
