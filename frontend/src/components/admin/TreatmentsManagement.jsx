// Changes: Removed base44 import. TreatmentPreset.list/create/update/delete.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, FlaskConical, Lock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TreatmentPreset } from '@/api';

const BUILT_IN = [
  { name: 'Hydrogen Peroxide', concentration: 15, unit: 'mg/L' },
  { name: 'Formalin Low',      concentration: 15, unit: 'ml/L' },
  { name: 'Formalin Normal',   concentration: 20, unit: 'ml/L' },
  { name: 'Formalin High',     concentration: 25, unit: 'ml/L' },
  { name: 'Praziquantel',      concentration: 2,  unit: 'mg/L' },
  { name: 'Copper Low',        concentration: 0.5,unit: 'mg/L' },
  { name: 'Copper High',       concentration: 1,  unit: 'mg/L' },
];
const EMPTY = { name: '', concentration: '', unit: 'mg/L', notes: '' };

export default function TreatmentsManagement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);

  const { data: customTreatments = [] } = useQuery({ queryKey: ['treatment-presets'], queryFn: () => TreatmentPreset.list() });

  const openAdd  = () => { setEditItem(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (t) => { setEditItem(t); setForm({ name: t.name, concentration: String(t.concentration), unit: t.unit, notes: t.notes || '' }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { name: form.name, concentration: parseFloat(form.concentration), unit: form.unit, notes: form.notes, isActive: true };
    if (editItem) await TreatmentPreset.update(editItem.id, payload);
    else          await TreatmentPreset.create(payload);
    qc.invalidateQueries({ queryKey: ['treatment-presets'] });
    setSaving(false); setModalOpen(false);
  };

  const handleDelete = async (id) => { await TreatmentPreset.delete(id); qc.invalidateQueries({ queryKey: ['treatment-presets'] }); };
  const activeCustom = customTreatments.filter(t => t.isActive !== false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-teal-600" /> Treatments Management</CardTitle>
          <Button onClick={openAdd} size="sm" className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" /> Add Treatment</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {BUILT_IN.map(t => (
            <div key={t.name} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-800">{t.name}</span>
                <span className="ml-1 text-sm text-teal-700 font-medium">{t.concentration} {t.unit}</span>
                <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">built-in</span>
              </div>
            </div>
          ))}
          {activeCustom.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div>
                <span className="font-medium text-slate-800">{t.name}</span>
                <span className="ml-2 text-sm text-teal-700 font-medium">{t.concentration} {t.unit}</span>
                {t.notes && <span className="text-sm text-slate-500 ml-2">— {t.notes}</span>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {activeCustom.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No custom treatments added yet.</p>}
        </div>
      </CardContent>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Treatment' : 'Add Treatment'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Salt Bath" /></div>
            <div>
              <Label>Concentration *</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" value={form.concentration} onChange={e => set('concentration', e.target.value)} placeholder="e.g. 5" />
                <Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="mg/L" className="w-24" />
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16 resize-none" placeholder="Optional notes..." /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.concentration} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
