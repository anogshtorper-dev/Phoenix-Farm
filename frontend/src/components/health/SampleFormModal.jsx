// src/components/health/SampleFormModal.jsx
// Changes:
//   - Removed base44 import
//   - RASSystem.filter, Department.filter, Pond.filter, FishBatch.filter, HealthSample.create/update
//   - base44.integrations.Core.UploadFile({ file }) → UploadFile({ file }) from @/api
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import ImageLightbox from '@/components/health/ImageLightbox';
import { RASSystem, Department, Pond, FishBatch, HealthSample, UploadFile } from '@/api';

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  tankNumber: '', group: '', line: '', fishExamined: '',
  finding1: '', finding2: '', finding3: '', finding4: '', finding5: '',
  diagnosis: '', images: [], notes: '', treatment: '',
};

export default function SampleFormModal({ open, onClose, sample, defaultDate, onSaved, readOnly = false }) {
  const [form,            setForm]            = useState(EMPTY);
  const [saving,          setSaving]          = useState(false);
  const [uploadingImage,  setUploadingImage]  = useState(false);
  const [lightbox,        setLightbox]        = useState(null);
  const [pondMode,        setPondMode]        = useState('filtered');
  const [selectedSystem,  setSelectedSystem]  = useState('');
  const [selectedDept,    setSelectedDept]    = useState('');
  const [selectedPondId,  setSelectedPondId]  = useState('');
  const [pondSearch,      setPondSearch]      = useState('');
  const [pondDropdownOpen,setPondDropdownOpen]= useState(false);
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const pondInputRef   = useRef(null);

  const { data: systems     = [] } = useQuery({ queryKey: ['ras-systems'],  queryFn: () => RASSystem.filter({ isActive: true }) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'],  queryFn: () => Department.filter({ isActive: true }) });
  const { data: allPonds    = [] } = useQuery({ queryKey: ['ponds-active'], queryFn: () => Pond.filter({ isActive: true }) });
  const { data: allBatches  = [] } = useQuery({ queryKey: ['fish-batches'],queryFn: () => FishBatch.filter({ isActive: true }) });

  const filteredPonds = allPonds.filter(p => {
    const sysMatch   = pondMode !== 'filtered' || !selectedSystem || p.systemId     === selectedSystem;
    const deptMatch  = pondMode !== 'filtered' || !selectedDept   || p.departmentId === selectedDept;
    const srchMatch  = !pondSearch || p.number.toLowerCase().startsWith(pondSearch.toLowerCase());
    return sysMatch && deptMatch && srchMatch;
  });

  const pondBatches = allBatches.filter(b => b.currentTankId === selectedPondId);

  useEffect(() => {
    if (!selectedPondId) return;
    const pond = allPonds.find(p => p.id === selectedPondId);
    if (pond) setForm(f => ({ ...f, tankNumber: pond.number }));
    if      (pondBatches.length === 1) setForm(f => ({ ...f, group: pondBatches[0].group || '', line: pondBatches[0].line || '' }));
    else if (pondBatches.length === 0) setForm(f => ({ ...f, group: '', line: '' }));
  }, [selectedPondId, allBatches.length]);

  useEffect(() => {
    if (sample) {
      setForm({ ...EMPTY, ...sample });
      setSelectedPondId(''); setSelectedSystem(''); setSelectedDept('');
      setPondSearch(sample.tankNumber || '');
    } else {
      setForm({ ...EMPTY, date: defaultDate || EMPTY.date });
      setSelectedPondId(''); setSelectedSystem(''); setSelectedDept(''); setPondSearch('');
    }
  }, [sample, defaultDate, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const { file_url } = await UploadFile({ file });
      uploaded.push(file_url);
    }
    setForm(f => ({ ...f, images: [...(f.images || []), ...uploaded] }));
    setUploadingImage(false);
  };

  const removeImage = (idx) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const handlePondSelect = (pondId) => {
    setSelectedPondId(pondId);
    const pond = allPonds.find(p => p.id === pondId);
    if (pond) {
      setForm(f => ({ ...f, tankNumber: pond.number, group: '', line: '' }));
      setPondSearch(pond.number);
      setSelectedSystem(pond.systemId || '');
      setSelectedDept(pond.departmentId || '');
    }
    setPondDropdownOpen(false);
  };

  const handleBatchSelect = (batchId) => {
    const batch = allBatches.find(b => b.id === batchId);
    if (batch) setForm(f => ({ ...f, group: batch.group || '', line: batch.line || '' }));
  };

  const handleSave = async () => {
    const missing = [];
    const today = new Date().toISOString().split('T')[0];
    if (!form.date)         missing.push('Date');
    if (!form.tankNumber)   missing.push('Tank/Pool');
    if (!form.group)        missing.push('Group');
    if (!form.line)         missing.push('Batch');
    if (!form.fishExamined) missing.push('Fish Examined');
    if (form.date && form.date > today) missing.push('Sample date cannot be in the future');
    if (missing.length > 0) { window.alert(`Please fix the following:\n• ${missing.join('\n• ')}`); return; }
    setSaving(true);
    try {
      if (sample?.id) await HealthSample.update(sample.id, form);
      else            await HealthSample.create(form);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const Field     = ({ label, value }) => <div><Label>{label}</Label><div className="h-9 px-3 py-1 rounded-md border bg-slate-50 flex items-center text-sm">{value || '—'}</div></div>;
  const FieldArea = ({ label, value }) => <div><Label>{label}</Label><div className="px-3 py-2 rounded-md border bg-slate-50 text-sm min-h-[64px] whitespace-pre-wrap">{value || '—'}</div></div>;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'View Sample' : sample ? 'Edit Sample' : 'New Health Sample'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {readOnly ? <Field label="Date" value={form.date} /> : (
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} max={new Date().toISOString().split('T')[0]} /></div>
          )}

          <div className="col-span-2">
            <Label className="mb-2 block">{readOnly ? 'Tank' : 'Select Tank'}</Label>
            {readOnly ? (
              <div className="h-9 px-3 py-1 rounded-md border bg-slate-50 flex items-center text-sm">{form.tankNumber || '—'}</div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {['filtered','all'].map(mode => (
                    <Button key={mode} type="button" size="sm" variant={pondMode === mode ? 'default' : 'outline'}
                      onClick={() => { setPondMode(mode); setSelectedPondId(''); setSelectedSystem(''); setSelectedDept(''); }}
                      className={pondMode === mode ? 'bg-teal-600 hover:bg-teal-700' : ''}>
                      {mode === 'filtered' ? 'Filter by System / Dept' : 'All Active Tanks'}
                    </Button>
                  ))}
                </div>
                {pondMode === 'filtered' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-slate-500">System</Label>
                      <Select value={selectedSystem} onValueChange={v => { setSelectedSystem(v === '__all__' ? '' : v); setSelectedPondId(''); }}>
                        <SelectTrigger><SelectValue placeholder="All systems" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All systems</SelectItem>
                          {systems.sort((a,b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)).map(s => <SelectItem key={s.id} value={s.id}>{s.systemName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Department</Label>
                      <Select value={selectedDept} onValueChange={v => { setSelectedDept(v === '__all__' ? '' : v); setSelectedPondId(''); }}>
                        <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All departments</SelectItem>
                          {departments.sort((a,b) => a.name.localeCompare(b.name)).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Label className="text-xs text-slate-500">Tank</Label>
                  <Input ref={pondInputRef} value={pondSearch}
                    onChange={e => { setPondSearch(e.target.value); setForm(f => ({ ...f, tankNumber: e.target.value })); setSelectedPondId(''); setPondDropdownOpen(true); }}
                    onFocus={() => setPondDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPondDropdownOpen(false), 150)}
                    placeholder="Type or select tank..."
                  />
                  {pondDropdownOpen && filteredPonds.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredPonds.sort((a,b) => a.number.localeCompare(b.number, undefined, {numeric: true})).map(p => (
                        <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700" onMouseDown={() => handlePondSelect(p.id)}>{p.number}</button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPondId && pondBatches.length > 1 && (
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Batch (multiple found — select one)</Label>
                    <Select value={form.batchId || ''} onValueChange={handleBatchSelect}>
                      <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                      <SelectContent>{pondBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.group} – {b.line}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          {readOnly ? <Field label="Group" value={form.group} /> : <div><Label>Group</Label><Input value={form.group} onChange={e => set('group', e.target.value)} placeholder="Species/group" /></div>}
          {readOnly ? <Field label="Line" value={form.line} /> : <div><Label>Line</Label><Input value={form.line} onChange={e => set('line', e.target.value)} placeholder="Line/color" /></div>}
          {readOnly ? <Field label="Fish Examined" value={form.fishExamined} /> : <div><Label>Fish Examined</Label><Input type="number" value={form.fishExamined} onChange={e => set('fishExamined', e.target.value)} placeholder="0" /></div>}

          {[1,2,3,4,5].map(n => (
            readOnly ? <Field key={n} label={`Finding ${n}`} value={form[`finding${n}`]} /> : (
              <div key={n}><Label>Finding {n}</Label><Input value={form[`finding${n}`]} onChange={e => set(`finding${n}`, e.target.value)} placeholder={`Finding ${n}`} /></div>
            )
          ))}

          <div className="col-span-2">
            {readOnly ? <FieldArea label="Diagnosis" value={form.diagnosis} /> : <><Label>Diagnosis</Label><Textarea value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} className="h-16 resize-none" placeholder="Diagnosis..." /></>}
          </div>

          <div className="col-span-2">
            <Label>Images</Label>
            {!readOnly && (
              <div className="flex gap-2 mt-1 flex-wrap">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                <input ref={fileInputRef}   type="file" accept="image/*" multiple            className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={uploadingImage} className="flex items-center gap-1"><Camera className="w-4 h-4" />Camera</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}   disabled={uploadingImage} className="flex items-center gap-1"><ImagePlus className="w-4 h-4" />Gallery / File</Button>
                {uploadingImage && <Loader2 className="w-5 h-5 animate-spin text-teal-600 self-center" />}
              </div>
            )}
            {form.images && form.images.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.images.map((url, idx) => (
                  <div key={idx} className="relative group w-24 h-24">
                    <img src={url} alt={`sample-img-${idx}`} className="w-24 h-24 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightbox({ images: form.images, index: idx })} />
                    {!readOnly && <button type="button" onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
            ) : readOnly ? <p className="text-sm text-slate-400 mt-1">No images</p> : null}
          </div>

          <div className="col-span-2">{readOnly ? <FieldArea label="Notes" value={form.notes} /> : <><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16 resize-none" placeholder="Additional notes..." /></>}</div>
          <div className="col-span-2">{readOnly ? <FieldArea label="Treatment" value={form.treatment} /> : <><Label>Treatment</Label><Textarea value={form.treatment} onChange={e => set('treatment', e.target.value)} className="h-16 resize-none" placeholder="Treatment applied..." /></>}</div>
        </div>

        {lightbox && <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
