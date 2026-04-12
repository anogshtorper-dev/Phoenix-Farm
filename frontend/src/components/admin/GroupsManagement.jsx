// Changes: Removed base44 import. PondGroup.list/create/update, Department.list replace entity calls.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PondGroup, Department } from '@/api';

const DEFAULT_FORM = { name: '', departmentId: '', notes: '', tempMin: 24, tempMax: 28, phMin: 6.8, phMax: 7.5, salinityMin: 30, salinityMax: 35 };

export default function GroupsManagement() {
  const [editingGroup, setEditingGroup] = useState(null);
  const [isAdding,     setIsAdding]     = useState(false);
  const [formData,     setFormData]     = useState(DEFAULT_FORM);
  const queryClient = useQueryClient();

  const { data: groups      = [] } = useQuery({ queryKey: ['groups'],      queryFn: () => PondGroup.list() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => Department.list() });

  const createMutation = useMutation({ mutationFn: (d) => PondGroup.create(d), onSuccess: () => { queryClient.invalidateQueries(['groups']); setIsAdding(false); setFormData(DEFAULT_FORM); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => PondGroup.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['groups']); setEditingGroup(null); setIsAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: (id) => PondGroup.update(id, { isActive: false }), onSuccess: () => queryClient.invalidateQueries(['groups']) });

  const handleSubmit = (e) => {
    e.preventDefault();
    editingGroup ? updateMutation.mutate({ id: editingGroup.id, data: formData }) : createMutation.mutate(formData);
  };
  const handleEdit = (g) => {
    setEditingGroup(g);
    setFormData({ name: g.name, departmentId: g.departmentId, notes: g.notes || '', tempMin: g.tempMin || 24, tempMax: g.tempMax || 28, phMin: g.phMin || 6.8, phMax: g.phMax || 7.5, salinityMin: g.salinityMin || 30, salinityMax: g.salinityMax || 35, ecMin: g.ecMin, ecMax: g.ecMax, doMin: g.doMin, doMax: g.doMax, alkalinityMin: g.alkalinityMin, alkalinityMax: g.alkalinityMax, ammoniaMin: g.ammoniaMin, ammoniaMax: g.ammoniaMax, nitriteMin: g.nitriteMin, nitriteMax: g.nitriteMax, nitrateMin: g.nitrateMin, nitrateMax: g.nitrateMax });
    setIsAdding(true);
  };

  const NF = (field, label, step = '0.1') => (
    <div><Label>{label}</Label><Input type="number" step={step} value={formData[field] ?? ''} onChange={e => setFormData({ ...formData, [field]: parseFloat(e.target.value) })} /></div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tank Groups & Thresholds</CardTitle>
            {!isAdding && <Button onClick={() => setIsAdding(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Add Group</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                <div>
                  <Label>Department *</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{departments.filter(d => d.isActive !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Water Quality Thresholds</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 font-medium text-sm">Temperature (°C)</div>
                  {NF('tempMin','Min')} {NF('tempMax','Max')} <div />
                  <div className="col-span-3 font-medium text-sm">pH</div>
                  {NF('phMin','Min')} {NF('phMax','Max')} <div />
                  <div className="col-span-3 font-medium text-sm">Salinity (ppt)</div>
                  {NF('salinityMin','Min')} {NF('salinityMax','Max')}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingGroup(null); setFormData(DEFAULT_FORM); }}>Cancel</Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{editingGroup ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {groups.filter(g => g.isActive !== false).map(group => {
              const dept = departments.find(d => d.id === group.departmentId);
              return (
                <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-slate-600">{dept?.name || 'Unknown Department'}</p>
                    <p className="text-xs text-slate-500 mt-1">Temp: {group.tempMin}-{group.tempMax}°C | pH: {group.phMin}-{group.phMax} | Salinity: {group.salinityMin}-{group.salinityMax} ppt</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(group)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm('Delete this group?')) deleteMutation.mutate(group.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
