// Changes: Removed base44 import. Species.list/create/update/delete.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Fish } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Species } from '@/api';

const EMPTY = { name: '', notes: '', isActive: true };

export default function SpeciesManagement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);

  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: () => Species.list() });

  const openAdd  = () => { setEditItem(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ name: s.name, notes: s.notes || '', isActive: s.isActive !== false }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) await Species.update(editItem.id, form);
    else          await Species.create(form);
    qc.invalidateQueries({ queryKey: ['species'] });
    setSaving(false); setModalOpen(false);
  };

  const handleDelete = async (id) => { await Species.delete(id); qc.invalidateQueries({ queryKey: ['species'] }); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Fish className="w-5 h-5 text-teal-600" /> Species Management</CardTitle>
          <Button onClick={openAdd} size="sm" className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" /> Add Species</Button>
        </div>
      </CardHeader>
      <CardContent>
        {species.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No species added yet.</p>}
        <div className="space-y-2">
          {species.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div>
                <span className="font-medium text-slate-800">{s.name}</span>
                {s.notes && <span className="text-sm text-slate-500 ml-2">— {s.notes}</span>}
                {s.isActive === false && <span className="ml-2 text-xs text-red-400">(inactive)</span>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Species' : 'Add Species'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Guppy" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 resize-none" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
