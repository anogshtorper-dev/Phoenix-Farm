// Changes: Removed base44 import. RASSystem.list/create/update/delete.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Waves, GripVertical, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RASSystem } from '@/api';

const EMPTY = { systemName: '', systemCode: '', systemVolume: '', notes: '', isActive: true };

export default function SystemsManagement() {
  const qc = useQueryClient();
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editItem,       setEditItem]       = useState(null);
  const [form,           setForm]           = useState(EMPTY);
  const [saving,         setSaving]         = useState(false);
  const [isEditOrder,    setIsEditOrder]    = useState(false);
  const [orderedSystems, setOrderedSystems] = useState([]);
  const [savingOrder,    setSavingOrder]    = useState(false);

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: async () => { const list = await RASSystem.list(); return list.sort((a,b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)); },
  });

  const openAdd  = () => { setEditItem(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ systemName: s.systemName, systemCode: s.systemCode, systemVolume: s.systemVolume ?? '', notes: s.notes || '', isActive: s.isActive !== false }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, systemVolume: form.systemVolume !== '' ? Number(form.systemVolume) : null };
    if (editItem) await RASSystem.update(editItem.id, payload);
    else          await RASSystem.create({ ...payload, sortOrder: systems.length });
    qc.invalidateQueries({ queryKey: ['systems'] });
    setSaving(false); setModalOpen(false);
  };

  const handleDelete = async (id) => { await RASSystem.delete(id); qc.invalidateQueries({ queryKey: ['systems'] }); };

  const startEditOrder = () => { setOrderedSystems([...systems]); setIsEditOrder(true); };
  const handleDragEnd  = (result) => {
    if (!result.destination) return;
    const items = Array.from(orderedSystems);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedSystems(items);
  };
  const handleSaveOrder = async () => {
    setSavingOrder(true);
    await Promise.all(orderedSystems.map((s, i) => RASSystem.update(s.id, { sortOrder: i })));
    qc.invalidateQueries({ queryKey: ['systems'] });
    setSavingOrder(false); setIsEditOrder(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Waves className="w-5 h-5 text-teal-600" /> Systems Management</CardTitle>
          <div className="flex gap-2">
            {!isEditOrder ? (
              <>
                <Button onClick={startEditOrder} size="sm" variant="outline"><GripVertical className="w-4 h-4 mr-1" /> Edit Order</Button>
                <Button onClick={openAdd} size="sm" className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" /> Add System</Button>
              </>
            ) : (
              <>
                <Button onClick={handleSaveOrder} size="sm" disabled={savingOrder} className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-1" /> {savingOrder ? 'Saving...' : 'Save Order'}</Button>
                <Button onClick={() => setIsEditOrder(false)} size="sm" variant="outline"><X className="w-4 h-4 mr-1" /> Cancel</Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {systems.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No systems added yet.</p>}
        {isEditOrder ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="systems">
              {(provided) => (
                <div className="space-y-2" {...provided.droppableProps} ref={provided.innerRef}>
                  {orderedSystems.map((s, index) => (
                    <Draggable key={s.id} draggableId={s.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`flex items-center gap-3 p-3 border rounded-lg bg-white cursor-move transition-shadow ${snapshot.isDragging ? 'shadow-lg opacity-90' : ''}`}>
                          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">{s.systemName}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.systemCode}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-2">
            {systems.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div>
                  <span className="font-medium text-slate-800">{s.systemName}</span>
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.systemCode}</span>
                  {s.systemVolume != null && <span className="ml-2 text-sm text-teal-700 font-medium">{s.systemVolume.toLocaleString()} L</span>}
                  {s.notes && <span className="text-sm text-slate-500 ml-2">— {s.notes}</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete "{s.systemName}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? 'Edit System' : 'Add System'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>System Name *</Label><Input value={form.systemName} onChange={e => set('systemName', e.target.value)} placeholder="e.g. Fattening System" /></div>
            <div><Label>System Code *</Label><Input value={form.systemCode} onChange={e => set('systemCode', e.target.value)} placeholder="e.g. FS1" /></div>
            <div><Label>Volume (Liters)</Label><Input type="number" value={form.systemVolume} onChange={e => set('systemVolume', e.target.value)} placeholder="e.g. 5000" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16 resize-none" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.systemName || !form.systemCode} className="bg-teal-600 hover:bg-teal-700">{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
