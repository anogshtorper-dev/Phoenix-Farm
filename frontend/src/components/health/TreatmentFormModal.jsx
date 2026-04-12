// src/components/health/TreatmentFormModal.jsx
// Changes: Removed base44 import. RASSystem.filter, TreatmentPreset.filter,
// Treatment.create/update replace entity calls.
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RASSystem, TreatmentPreset, Treatment } from '@/api';

const BUILT_IN_TREATMENTS = [
  { name: 'Hydrogen Peroxide', concentration: 15,  unit: 'mg/L' },
  { name: 'Formalin Low',      concentration: 15,  unit: 'ml/L' },
  { name: 'Formalin Normal',   concentration: 20,  unit: 'ml/L' },
  { name: 'Formalin High',     concentration: 25,  unit: 'ml/L' },
  { name: 'Praziquantel',      concentration: 2,   unit: 'mg/L' },
  { name: 'Copper Low',        concentration: 0.5, unit: 'mg/L' },
  { name: 'Copper High',       concentration: 1,   unit: 'mg/L' },
];

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  treatmentType: '', concentration: '', concentrationUnit: '',
  systems: [], staffName: '', status: 'Pending', notes: '', isCustom: false,
};

const displayName = (name) => name.replace(/\s*System\b/gi, '').trim();

function SystemMultiSelect({ systems, selected, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const toggle   = (id) => onChange(selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]);
  const filtered = systems.filter(s => displayName(s.systemName).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-white min-h-[38px] cursor-pointer" onClick={() => setOpen(o => !o)}>
        {selected.length === 0 && <span className="text-slate-400 text-sm">Select systems...</span>}
        {systems.filter(s => selected.includes(s.id)).map(s => (
          <span key={s.id} className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
            {displayName(s.systemName)}
            <button type="button" className="hover:text-red-500" onClick={e => { e.stopPropagation(); toggle(s.id); }}>×</button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          <div className="p-1"><input className="w-full px-2 py-1 text-sm border rounded mb-1" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus /></div>
          {filtered.map(s => (
            <div key={s.id} className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 flex items-center gap-2 ${selected.includes(s.id) ? 'bg-teal-50 font-medium' : ''}`} onClick={() => toggle(s.id)}>
              <span className={`w-4 h-4 border rounded flex items-center justify-center text-xs ${selected.includes(s.id) ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>{selected.includes(s.id) ? '✓' : ''}</span>
              {displayName(s.systemName)}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No systems found</div>}
        </div>
      )}
    </div>
  );
}

export default function TreatmentFormModal({ open, onClose, treatment, defaultDate, onSaved, readOnly = false }) {
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: systems         = [] } = useQuery({ queryKey: ['ras-systems'],      queryFn: () => RASSystem.filter({ isActive: true }) });
  const { data: treatmentPresets = [] } = useQuery({ queryKey: ['treatment-presets'], queryFn: () => TreatmentPreset.filter({ isActive: true }) });

  useEffect(() => {
    setForm(treatment ? { ...EMPTY, ...treatment } : { ...EMPTY, date: defaultDate || EMPTY.date });
  }, [treatment, defaultDate, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTreatmentSelect = (value) => {
    if (value === 'custom') {
      setForm(f => ({ ...f, treatmentType: '', concentrationUnit: '', isCustom: true }));
    } else {
      const bi = BUILT_IN_TREATMENTS.find(p => p.name === value);
      if (bi) { setForm(f => ({ ...f, treatmentType: bi.name, concentrationUnit: bi.unit, isCustom: false })); return; }
      const pr = treatmentPresets.find(p => p.name === value);
      if (pr) { setForm(f => ({ ...f, treatmentType: pr.name, concentrationUnit: pr.unit, isCustom: false })); }
    }
  };

  const handleSave = async () => {
    const missing = [];
    const today   = new Date().toISOString().split('T')[0];
    if (!form.date)                             missing.push('Date');
    if (!form.treatmentType)                    missing.push('Treatment Type');
    if (!form.concentration)                    missing.push('Concentration');
    if (!form.concentrationUnit)               missing.push('Unit');
    if (!form.systems || form.systems.length === 0) missing.push('System');
    if (form.date && form.date > today)         missing.push('Treatment date cannot be in the future');
    if (missing.length > 0) { window.alert(`Please fix the following:\n• ${missing.join('\n• ')}`); return; }
    setSaving(true);
    try {
      if (treatment?.id) await Treatment.update(treatment.id, form);
      else               await Treatment.create(form);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const Field     = ({ label, value }) => <div><Label>{label}</Label><div className="h-9 px-3 py-1 rounded-md border bg-slate-50 flex items-center text-sm">{value || '—'}</div></div>;
  const FieldArea = ({ label, value }) => <div><Label>{label}</Label><div className="px-3 py-2 rounded-md border bg-slate-50 text-sm min-h-[64px] whitespace-pre-wrap">{value || '—'}</div></div>;
  const systemNames = systems.filter(s => (form.systems || []).includes(s.id)).map(s => displayName(s.systemName)).join(', ');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'View Treatment' : treatment ? 'Edit Treatment' : 'New Treatment'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 mt-2">
          {readOnly ? <Field label="Date" value={form.date} /> : (
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} max={new Date().toISOString().split('T')[0]} /></div>
          )}

          {readOnly ? <Field label="Treatment Type" value={form.treatmentType} /> : (
            <div>
              <Label>Treatment Type *</Label>
              {!form.isCustom ? (
                <Select value={form.treatmentType} onValueChange={handleTreatmentSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a treatment..." /></SelectTrigger>
                  <SelectContent>
                    {BUILT_IN_TREATMENTS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                    {treatmentPresets.length > 0 && BUILT_IN_TREATMENTS.length > 0 && <div className="border-t my-1" />}
                    {treatmentPresets.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    <SelectItem value="custom">+ Custom Treatment</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input value={form.treatmentType} onChange={e => set('treatmentType', e.target.value)} placeholder="Enter treatment name" />
                  <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, isCustom: false, treatmentType: '', concentrationUnit: '' }))} className="w-full">Back to Presets</Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {readOnly ? <Field label="Concentration" value={form.concentration} /> : (
              <div><Label>Concentration *</Label><Input type="number" step="0.01" value={form.concentration} onChange={e => set('concentration', e.target.value)} placeholder="0" /></div>
            )}
            {readOnly ? <Field label="Unit" value={form.concentrationUnit} /> : (
              <div>
                <Label>Unit *</Label>
                {form.isCustom
                  ? <Input value={form.concentrationUnit} onChange={e => set('concentrationUnit', e.target.value)} placeholder="e.g. mg/L, ml/L, ppt" />
                  : <div className="h-9 px-3 py-1 rounded-md border border-input bg-muted flex items-center text-sm">{form.concentrationUnit || 'Auto-filled'}</div>}
              </div>
            )}
          </div>

          {readOnly ? <Field label="Systems" value={systemNames} /> : (
            <div><Label>System *</Label><SystemMultiSelect systems={systems} selected={form.systems || []} onChange={v => set('systems', v)} /></div>
          )}

          {readOnly ? <Field label="Staff Name" value={form.staffName} /> : (
            <div><Label>Staff Name</Label><Input value={form.staffName} onChange={e => set('staffName', e.target.value)} placeholder="Staff member name" /></div>
          )}

          {readOnly ? <Field label="Status" value={form.status} /> : (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Pending','Treated','Monitoring','Resolved'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {readOnly ? <FieldArea label="Notes" value={form.notes} /> : (
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16 resize-none" placeholder="Additional notes..." /></div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
