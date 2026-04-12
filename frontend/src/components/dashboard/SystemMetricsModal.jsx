// src/components/dashboard/SystemMetricsModal.jsx
// Changes: Removed base44 import.
//   WaterQualityMeasurement.filter/create/update, Pond.update, AuditHistory.create replace all entity calls.
//   `measuredAt` → stored as `date` in new schema; sent as `date` on create,
//   but reads filter measurements by `m.date || m.measuredAt` for compatibility.
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Droplets, Pencil, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { WaterQualityMeasurement, Pond, AuditHistory } from '@/api';

const getMeasuredAt = (m) => m.date || m.measuredAt;

function calcUIA(tan, temp, ph) {
  if ([tan, temp, ph].some(v => v === '' || v == null)) return null;
  const t = parseFloat(tan), T = parseFloat(temp), P = parseFloat(ph);
  if ([t, T, P].some(isNaN)) return null;
  return t * (1 / (1 + Math.pow(10, 0.09018 + (2729.92 / (T + 273.15)) - P)));
}
function calcCO2(alkalinity, ph) {
  if ([alkalinity, ph].some(v => v === '' || v == null)) return null;
  const alk = parseFloat(alkalinity), P = parseFloat(ph);
  if ([alk, P].some(isNaN)) return null;
  return alk * Math.pow(10, 6.3 - P);
}

const today      = new Date().toISOString().split('T')[0];
const emptyMetrics = { temperature: '', ph: '', ec: '', do: '', alkalinity: '', ammonia: '', nitrite: '', nitrate: '' };

export default function SystemMetricsModal({ system, ponds, onClose, onUpdate }) {
  const [selectedDate,          setSelectedDate]          = useState(today);
  const [metrics,               setMetrics]               = useState(emptyMetrics);
  const [isEditMode,            setIsEditMode]            = useState(true);
  const [existingMeasurementId, setExistingMeasurementId] = useState(null);
  const [sampledPondId,         setSampledPondId]         = useState('');
  const [notes,                 setNotes]                 = useState('');
  const [pondSearch,            setPondSearch]            = useState('');
  const [showPondDropdown,      setShowPondDropdown]      = useState(false);

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery({
    queryKey: ['measurements', system.id, selectedDate],
    queryFn:  () => WaterQualityMeasurement.filter({ systemId: system.id }),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!measurements || isEditMode) return;
    const dayMeasurements = measurements.filter(m => (getMeasuredAt(m) || '').slice(0, 10) === selectedDate);
    if (dayMeasurements.length > 0) {
      const latest = dayMeasurements.sort((a, b) => new Date(getMeasuredAt(b)) - new Date(getMeasuredAt(a)))[0];
      setExistingMeasurementId(latest.id);
      setSampledPondId(latest.pondId || '');
      setNotes(latest.notes || '');
      setMetrics({ temperature: latest.temperature ?? '', ph: latest.ph ?? '', ec: latest.ec ?? '',
        do: latest.do ?? '', alkalinity: latest.alkalinity ?? '', ammonia: latest.ammonia ?? '',
        nitrite: latest.nitrite ?? '', nitrate: latest.nitrate ?? '' });
    } else {
      setExistingMeasurementId(null); setMetrics(emptyMetrics); setNotes(''); setSampledPondId('');
    }
  }, [measurements, selectedDate, isEditMode]);

  useEffect(() => { setIsEditMode(false); }, [selectedDate]);

  const uia = calcUIA(metrics.ammonia, metrics.temperature, metrics.ph);
  const co2 = calcCO2(metrics.alkalinity, metrics.ph);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const timestamp = new Date(`${selectedDate}T${new Date().toTimeString().split(' ')[0]}`).toISOString();
      const updates   = {};
      Object.keys(metrics).forEach(key => { if (metrics[key] !== '') updates[key] = parseFloat(metrics[key]); });
      const uiaVal = calcUIA(metrics.ammonia, metrics.temperature, metrics.ph);
      if (uiaVal !== null) updates.uia = uiaVal;
      const co2Val = calcCO2(metrics.alkalinity, metrics.ph);
      if (co2Val !== null) updates.co2 = co2Val;

      // Update pond live metrics only if this is a recent/latest entry
      const latestMs = measurements.filter(m => m.systemId === system.id).sort((a, b) => new Date(getMeasuredAt(b)) - new Date(getMeasuredAt(a)))[0];
      const latestDate = latestMs ? getMeasuredAt(latestMs).slice(0, 10) : null;
      const isLatest   = selectedDate === today || selectedDate === latestDate;

      if (isLatest && sampledPondId) {
        const pondUpd = { lastUpdated: timestamp };
        ['temperature','ph','ec','do','alkalinity','ammonia','nitrite','nitrate','uia','co2'].forEach(f => { if (updates[f] !== undefined) pondUpd[f] = updates[f]; });
        await Pond.update(sampledPondId, pondUpd);
      }

      const measurementData = {
        ...updates,
        // Store as `date` in new schema; also include measuredAt for any legacy code
        date:  timestamp,
        notes: notes || '',
        ...(sampledPondId ? { pondId: sampledPondId } : {}),
      };

      if (existingMeasurementId) {
        await WaterQualityMeasurement.update(existingMeasurementId, measurementData);
      } else {
        await WaterQualityMeasurement.create({ systemId: system.id, ...measurementData });
      }
      await AuditHistory.create({
        entityType: 'RASSystem', entityId: system.id, action: 'update',
        description: `Updated water quality for ${system.systemName}${!isLatest ? ' (historical)' : ''}`,
        after: updates,
      });
    },
    onSuccess: () => { setIsEditMode(false); onUpdate(); },
  });

  const filteredPonds  = ponds.filter(p => p.number.toLowerCase().includes(pondSearch.toLowerCase()));
  const selectedPond   = ponds.find(p => p.id === sampledPondId);

  const fields = [
    { key: 'temperature', label: 'Temperature (°C)', step: '0.1' },
    { key: 'ph',          label: 'pH',               step: '0.1' },
    { key: 'ec',          label: 'EC (µS/cm)',        step: '1'   },
    { key: 'do',          label: 'DO (mg/L)',         step: '0.1' },
    { key: 'alkalinity',  label: 'Alkalinity (mg/L)', step: '1'  },
    { key: 'ammonia',     label: 'TAN - Total Ammonia Nitrogen (mg/L)', step: '0.01' },
    { key: 'nitrite',     label: 'Nitrite (mg/L)',    step: '0.01' },
    { key: 'nitrate',     label: 'Nitrate (mg/L)',    step: '1'   },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Droplets className="w-6 h-6 text-teal-600" />
            <div>
              <DialogTitle className="text-xl">Update Water Quality Metrics</DialogTitle>
              <p className="text-sm text-slate-600 mt-1">{system.systemName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Date</Label>
            <Input type="date" value={selectedDate} max={today} onChange={e => setSelectedDate(e.target.value)} className="w-48" />
            {loadingMeasurements && <span className="text-sm text-slate-400">Loading...</span>}
            {!loadingMeasurements && existingMeasurementId && !isEditMode && <span className="text-sm text-teal-600 font-medium">Showing last measurement of the day</span>}
            {!loadingMeasurements && !existingMeasurementId && <span className="text-sm text-slate-400 italic">No measurement found for this date</span>}
          </div>

          {/* Sampled pond */}
          <div>
            <Label>Sampled Tank (optional)</Label>
            <div className="relative mt-1">
              <div className="flex items-center border rounded-md px-3 py-2 cursor-text bg-white" onClick={() => setShowPondDropdown(true)}>
                <input className="flex-1 outline-none text-sm bg-transparent" placeholder="Search tank number..."
                  value={showPondDropdown ? pondSearch : (selectedPond ? selectedPond.number : '')}
                  onChange={e => { setPondSearch(e.target.value); setShowPondDropdown(true); }}
                  onFocus={() => { setPondSearch(''); setShowPondDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowPondDropdown(false), 150)}
                />
                {sampledPondId && !showPondDropdown && (
                  <button className="text-slate-400 hover:text-slate-600 text-xs ml-2" onMouseDown={e => { e.preventDefault(); setSampledPondId(''); setPondSearch(''); }}>✕</button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
              </div>
              {showPondDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredPonds.length === 0 ? <div className="px-3 py-2 text-sm text-slate-400 italic">No tanks found</div>
                    : filteredPonds.map(p => (
                        <div key={p.id} className={`px-3 py-2 text-sm cursor-pointer hover:bg-teal-50 ${sampledPondId === p.id ? 'bg-teal-100 font-medium' : ''}`}
                          onMouseDown={() => { setSampledPondId(p.id); setPondSearch(''); setShowPondDropdown(false); }}>
                          {p.number}{p.species ? ` — ${p.species}` : ''}
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 bg-teal-50 border border-teal-200 p-3 rounded-md">
            The metrics will be updated for all {ponds.length} tanks in this system
          </p>

          <div className="grid grid-cols-2 gap-4">
            {fields.map(({ key, label, step }) => (
              <div key={key}>
                <Label>{label}</Label>
                {isEditMode ? (
                  <Input type="number" step={step} value={metrics[key]} onChange={e => setMetrics({ ...metrics, [key]: e.target.value })} placeholder="Leave empty if no update needed" />
                ) : (
                  <div className="p-2 border rounded-md bg-slate-50 text-slate-800 font-mono text-sm mt-1 min-h-[38px]">
                    {metrics[key] !== '' ? metrics[key] : <span className="text-slate-400 italic">—</span>}
                  </div>
                )}
              </div>
            ))}
            <div className="col-span-2">
              <Label>Unionized Ammonia — UIA (mg/L) <span className="text-xs text-slate-400 font-normal">Auto-calculated</span></Label>
              <div className="p-2 border rounded-md bg-slate-100 text-slate-700 font-mono text-sm mt-1 min-h-[38px]">
                {uia !== null ? uia.toFixed(4) : <span className="text-slate-400 italic">Fill TAN, Temperature & pH to calculate</span>}
              </div>
            </div>
            <div className="col-span-2">
              <Label>CO₂ (mg/L) <span className="text-xs text-slate-400 font-normal">Auto-calculated</span></Label>
              <div className="p-2 border rounded-md bg-slate-100 text-slate-700 font-mono text-sm mt-1 min-h-[38px]">
                {co2 !== null ? co2.toFixed(4) : <span className="text-slate-400 italic">Fill Alkalinity & pH to calculate</span>}
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            {isEditMode ? (
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Free text notes..." className="mt-1 h-20 resize-none" />
            ) : (
              <div className="p-2 border rounded-md bg-slate-50 text-slate-800 text-sm mt-1 min-h-[38px]">
                {notes || <span className="text-slate-400 italic">—</span>}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {!isEditMode && (
                <Button variant="outline" onClick={() => setIsEditMode(true)} className="gap-2">
                  <Pencil className="w-4 h-4" />Edit
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {isEditMode && (
                <Button onClick={() => updateMutation.mutate()} className="bg-teal-600 hover:bg-teal-700" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Save Update'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
