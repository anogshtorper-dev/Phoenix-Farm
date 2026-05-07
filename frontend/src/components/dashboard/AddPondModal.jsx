// src/components/dashboard/AddPondModal.jsx
// Changes: Removed base44 import. Pond.list/create, Department.list, RASSystem.list, AuditHistory.create.
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pond, Department, RASSystem, AuditHistory } from '@/api';

export default function AddPondModal({ defaultSystemId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    number: '', departmentId: '', systemId: defaultSystemId || '',
  });
  const [duplicateError, setDuplicateError] = useState(false);

  const { data: allPonds    = [] } = useQuery({ queryKey: ['allPonds'],    queryFn: () => Pond.list() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => Department.list() });
  const { data: systems     = [] } = useQuery({ queryKey: ['systems'],     queryFn: () => RASSystem.list() });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const pond = await Pond.create({ ...data, lastUpdated: new Date().toISOString(), gridRow: 0, gridColumn: 0 });
      await AuditHistory.create({ entityType: 'Pond', entityId: pond.id, action: 'create', description: `Created tank ${data.number}`, after: pond });
      return pond;
    },
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const duplicate = allPonds.find(p => p.isActive !== false && p.number.toLowerCase() === formData.number.trim().toLowerCase());
    if (duplicate) { setDuplicateError(true); return; }
    createMutation.mutate(formData);
  };

  return (
    <React.Fragment>
      <AlertDialog open={duplicateError} onOpenChange={setDuplicateError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Tank Name</AlertDialogTitle>
            <AlertDialogDescription>A tank with the number &quot;{formData.number}&quot; already exists. Please choose a different tank number.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateError(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl">Add New Tank</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Tank Number *</Label>
              <Input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} required placeholder="Enter tank number" />
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)).map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>System *</Label>
              <Select value={formData.systemId} onValueChange={v => setFormData({ ...formData, systemId: v })}>
                <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                <SelectContent>
                  {systems.filter(s => s.isActive !== false).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)).map(sys => (
                    <SelectItem key={sys.id} value={sys.id}>{sys.systemName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Tank'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
