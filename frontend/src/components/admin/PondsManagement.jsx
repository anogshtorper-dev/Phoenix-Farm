// Changes: Removed base44 import. Pond.list/create/update, Department.list, PondGroup.list, RASSystem.list.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Pond, Department, PondGroup, RASSystem } from '@/api';

export default function PondsManagement() {
  const [editingPond,     setEditingPond]     = useState(null);
  const [isAdding,        setIsAdding]        = useState(false);
  const [pondToDelete,    setPondToDelete]    = useState(null);
  const [duplicateError,  setDuplicateError]  = useState(false);
  const [selectedPonds,   setSelectedPonds]   = useState(new Set());
  const [collapsedSystems,setCollapsedSystems]= useState(new Set());
  const [confirmBulkDelete,setConfirmBulkDelete] = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [formData,        setFormData]        = useState({ number: '', departmentId: '', systemId: '' });
  const queryClient = useQueryClient();

  const { data: ponds       = [] } = useQuery({ queryKey: ['ponds'],       queryFn: () => Pond.list() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => Department.list() });
  const { data: groups      = [] } = useQuery({ queryKey: ['groups'],      queryFn: () => PondGroup.list() });
  const { data: systems     = [] } = useQuery({ queryKey: ['systems'],     queryFn: () => RASSystem.list() });

  const createMutation    = useMutation({ mutationFn: (d) => Pond.create({ ...d, lastUpdated: new Date().toISOString() }), onSuccess: () => { queryClient.invalidateQueries(['ponds']); setIsAdding(false); resetForm(); } });
  const updateMutation    = useMutation({ mutationFn: ({ id, data }) => Pond.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['ponds']); setEditingPond(null); setIsAdding(false); } });
  const deleteMutation    = useMutation({ mutationFn: (id) => Pond.update(id, { isActive: false }), onSuccess: () => queryClient.invalidateQueries(['ponds']) });
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => { await Promise.all(ids.map(id => Pond.update(id, { isActive: false }))); },
    onSuccess: () => { queryClient.invalidateQueries(['ponds']); setSelectedPonds(new Set()); setConfirmBulkDelete(false); },
  });

  const toggleSelectPond = (id) => setSelectedPonds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAll  = (ids) => setSelectedPonds(prev => { const next = new Set(prev); const all = ids.every(id => next.has(id)); ids.forEach(id => all ? next.delete(id) : next.add(id)); return next; });
  const toggleCollapse   = (sid) => setCollapsedSystems(prev => { const next = new Set(prev); next.has(sid) ? next.delete(sid) : next.add(sid); return next; });
  const resetForm = () => setFormData({ number: '', departmentId: '', systemId: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const isDup = ponds.filter(p => p.isActive !== false && p.id !== editingPond?.id).some(p => p.number.trim().toLowerCase() === formData.number.trim().toLowerCase());
    if (isDup) { setDuplicateError(true); return; }
    editingPond ? updateMutation.mutate({ id: editingPond.id, data: formData }) : createMutation.mutate(formData);
  };
  const handleEdit = (pond) => { setEditingPond(pond); setFormData({ number: pond.number, departmentId: pond.departmentId, systemId: pond.systemId || '' }); setIsAdding(true); };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tanks Management</CardTitle>
            {!isAdding && <Button onClick={() => setIsAdding(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Add Tank</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tank Number *</Label>
                  <Input value={formData.number} onChange={e => { setFormData({ ...formData, number: e.target.value }); setDuplicateError(false); }} required />
                  {duplicateError && <p className="text-red-500 text-xs mt-1">A tank with this name already exists.</p>}
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{departments.filter(d => d.isActive !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>RAS System *</Label>
                  <Select value={formData.systemId} onValueChange={v => setFormData({ ...formData, systemId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                    <SelectContent>{systems.filter(s => s.isActive !== false).map(s => <SelectItem key={s.id} value={s.id}>{s.systemName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingPond(null); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{editingPond ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search tanks by number, species, department..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {selectedPonds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium text-red-700">{selectedPonds.size} tank(s) selected</span>
              <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)}><Trash2 className="w-4 h-4 mr-1" /> Delete Selected</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedPonds(new Set())}>Clear</Button>
            </div>
          )}

          <div className="space-y-4">
            {(() => {
              const q = searchQuery.toLowerCase().trim();
              const activePonds = ponds.filter(p => p.isActive !== false).filter(p => {
                if (!q) return true;
                const dept = departments.find(d => d.id === p.departmentId);
                const sys  = systems.find(s => s.id === p.systemId);
                return p.number?.toLowerCase().includes(q) || p.species?.toLowerCase().includes(q) || dept?.name?.toLowerCase().includes(q) || sys?.systemName?.toLowerCase().includes(q);
              });
              const systemGroups = {};
              activePonds.forEach(pond => { const key = pond.systemId || '__none__'; if (!systemGroups[key]) systemGroups[key] = []; systemGroups[key].push(pond); });

              return Object.entries(systemGroups)
                .sort(([a], [b]) => {
                  const sA = systems.find(s => s.id === a); const sB = systems.find(s => s.id === b);
                  return (sA?.sortOrder ?? 9999) - (sB?.sortOrder ?? 9999);
                })
                .map(([systemId, systemPonds]) => {
                  const system = systems.find(s => s.id === systemId);
                  const isCollapsed = collapsedSystems.has(systemId);
                  const pondIds = systemPonds.map(p => p.id);
                  const allSelected = pondIds.every(id => selectedPonds.has(id));
                  return (
                    <div key={systemId} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 cursor-pointer hover:bg-slate-200" onClick={() => toggleCollapse(systemId)}>
                        <Checkbox checked={allSelected} onCheckedChange={() => toggleSelectAll(pondIds)} onClick={e => e.stopPropagation()} />
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span className="font-semibold text-slate-700">{system?.systemName || 'No System'}</span>
                        <span className="text-xs text-slate-500 ml-auto">{systemPonds.length} tanks</span>
                      </div>
                      {!isCollapsed && (
                        <div className="divide-y">
                          {systemPonds.map(pond => {
                            const dept = departments.find(d => d.id === pond.departmentId);
                            const isSelected = selectedPonds.has(pond.id);
                            return (
                              <div key={pond.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 ${isSelected ? 'bg-red-50' : ''}`}>
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectPond(pond.id)} />
                                <div className="flex-1">
                                  <span className="font-medium">{pond.number}</span>
                                  <span className="text-xs text-slate-500 ml-2">{dept?.name || ''}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(pond)}><Edit className="w-4 h-4" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => setPondToDelete(pond)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
            })()}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={duplicateError} onOpenChange={setDuplicateError}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tank Name Already Exists</AlertDialogTitle><AlertDialogDescription>A tank named "{formData.number}" already exists. Please choose a different name.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setDuplicateError(false)}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {selectedPonds.size} Tanks</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {selectedPonds.size} selected tanks? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate([...selectedPonds])} className="bg-red-600 hover:bg-red-700">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pondToDelete} onOpenChange={() => setPondToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Tank</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete tank {pondToDelete?.number}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteMutation.mutate(pondToDelete.id); setPondToDelete(null); }} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
