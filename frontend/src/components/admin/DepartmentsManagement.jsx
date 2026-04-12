// Changes: Removed base44 import. Department.list/create/update replace entity calls.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Department } from '@/api';

export default function DepartmentsManagement() {
  const [editingDept, setEditingDept] = useState(null);
  const [isAdding,    setIsAdding]    = useState(false);
  const [formData,    setFormData]    = useState({ name: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => Department.list() });
  const createMutation = useMutation({ mutationFn: (d) => Department.create(d), onSuccess: () => { queryClient.invalidateQueries(['departments']); setIsAdding(false); setFormData({ name: '', notes: '' }); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => Department.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['departments']); setEditingDept(null); } });
  const deleteMutation = useMutation({ mutationFn: (id) => Department.update(id, { isActive: false }), onSuccess: () => queryClient.invalidateQueries(['departments']) });

  const handleSubmit = (e) => {
    e.preventDefault();
    editingDept ? updateMutation.mutate({ id: editingDept.id, data: formData }) : createMutation.mutate(formData);
  };
  const handleEdit = (dept) => { setEditingDept(dept); setFormData({ name: dept.name, notes: dept.notes || '' }); setIsAdding(true); };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Departments</CardTitle>
            {!isAdding && <Button onClick={() => setIsAdding(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Add Department</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50 mb-4">
              <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingDept(null); setFormData({ name: '', notes: '' }); }}>Cancel</Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{editingDept ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {departments.filter(d => d.isActive !== false).map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div><h3 className="font-semibold">{dept.name}</h3>{dept.notes && <p className="text-sm text-slate-500 mt-1">{dept.notes}</p>}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(dept)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm('Delete this department?')) deleteMutation.mutate(dept.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
