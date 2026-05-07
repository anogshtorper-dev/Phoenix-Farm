// Changes: Removed base44 import. Species.list, Line.list/create/update/delete.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Species, Line } from '@/api';

const EMPTY = { name: '', speciesName: '', isActive: true };

export default function LinesManagement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState({});

  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: () => Species.list() });
  const { data: lines   = [] } = useQuery({ queryKey: ['lines'],   queryFn: () => Line.list() });

  const openAdd  = (speciesName = '') => { setEditItem(null); setForm({ ...EMPTY, speciesName }); setModalOpen(true); };
  const openEdit = (l) => { setEditItem(l); setForm({ name: l.name, speciesName: l.speciesName, isActive: l.isActive !== false }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) await Line.update(editItem.id, form);
    else          await Line.create(form);
    qc.invalidateQueries({ queryKey: ['lines'] });
    setSaving(false); setModalOpen(false);
  };

  const handleDelete = async (id) => { await Line.delete(id); qc.invalidateQueries({ queryKey: ['lines'] }); };
  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5 text-teal-600" /> Lines Management</CardTitle>
          <Button onClick={() => openAdd()} size="sm" className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" /> Add Line</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {species.map(sp => {
          const spLines = lines.filter(l => l.speciesName === sp.name);
          const isOpen  = expanded[sp.name] !== false;
          return (
            <div key={sp.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => toggle(sp.name)}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800">{sp.name}</span>
                  <span className="text-xs text-slate-500">({spLines.length} lines)</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={e => { e.stopPropagation(); openAdd(sp.name); }}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {isOpen && (
                <div className="divide-y">
                  {spLines.length === 0 && <p className="text-sm text-slate-400 px-4 py-2">No lines yet.</p>}
                  {spLines.map(l => (
                    <div key={l.id} className="flex items-center justify-between px-4 py-2 bg-white hover:bg-slate-50">
                      <span className="text-sm text-slate-700">{l.name}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="w-3 h-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete "{l.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(l.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Line' : 'Add Line'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Species *</Label>
              <Select value={form.speciesName} onValueChange={v => setForm(f => ({ ...f, speciesName: v }))}>
                <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                <SelectContent>{species.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Line Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuxedo Red" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.speciesName} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
