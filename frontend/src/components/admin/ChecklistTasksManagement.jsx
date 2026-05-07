import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChecklistTask } from '@/api';
import { Plus, Save, Trash2, EyeOff, Eye } from 'lucide-react';

const TYPES = [
  { value: 'ok_notok', label: 'Ok / Not Ok' },
  { value: 'full_empty', label: 'Full / Empty' },
  { value: 'ok_notok_with_power', label: 'Ok / Not Ok + Power Note' },
];

const emptyForm = { label: '', type: 'ok_notok', sortOrder: 999 };

export default function ChecklistTasksManagement() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['checklist-tasks-admin'],
    queryFn: () => ChecklistTask.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['checklist-tasks-admin'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, sortOrder: Number(form.sortOrder || 999) };
      return editingId ? ChecklistTask.update(editingId, payload) : ChecklistTask.create(payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      refresh();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (task) => ChecklistTask.update(task.id, { isActive: !task.isActive }),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (task) => ChecklistTask.delete(task.id),
    onSuccess: refresh,
  });

  const startEdit = (task) => {
    setEditingId(task.id);
    setForm({ label: task.label, type: task.type || 'ok_notok', sortOrder: task.sortOrder ?? 999 });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.label.trim()) {
      window.alert('Checklist task label is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Checklist Task' : 'Add Checklist Task'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Task / Field name</Label>
              <Input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Pump Check" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((p) => ({ ...p, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} />
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700 gap-2">
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Save Changes' : 'Add Task'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Order</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-slate-50">
                      <td className="p-2 font-medium">{task.label}</td>
                      <td className="p-2">{TYPES.find((t) => t.value === task.type)?.label || task.type}</td>
                      <td className="p-2">{task.sortOrder}</td>
                      <td className="p-2">{task.isActive ? 'Active' : 'Hidden'}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(task)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate(task)} className="gap-1">
                            {task.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {task.isActive ? 'Hide' : 'Enable'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(task)} className="gap-1 text-red-600">
                            <Trash2 className="w-3 h-3" /> Soft delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
