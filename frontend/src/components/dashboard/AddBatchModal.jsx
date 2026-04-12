// src/components/dashboard/AddBatchModal.jsx
// Changes: Removed base44 import. Species.list, Line.list, FishBatch.list/create,
// Pond.update, AuditHistory.create replace entity calls.
// generateBatchId() no longer uses list sort arg — fetches list and sorts client-side.
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Species, Line, FishBatch, Pond, AuditHistory } from '@/api';

function generateBatchCode(stockingDate, line) {
  if (!stockingDate || !line) return '';
  const d   = new Date(stockingDate);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const pfx = line.replace(/\s+/g, '').slice(0, 3);
  return `${dd}${mm}${pfx.charAt(0).toUpperCase() + pfx.slice(1).toLowerCase()}`;
}

async function generateBatchId() {
  const existing = await FishBatch.list();
  if (!existing || existing.length === 0) return 'B001';
  const sorted = existing.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const lastId = sorted[0].batchId || 'B000';
  const num    = parseInt(lastId.replace(/\D/g, ''), 10) || 0;
  return `B${String(num + 1).padStart(3, '0')}`;
}

export default function AddBatchModal({ pond, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: () => Species.list() });
  const { data: lines   = [] } = useQuery({ queryKey: ['lines'],   queryFn: () => Line.list() });

  const [form, setForm] = useState({
    group: pond.species || '', line: pond.strainOrLine || '',
    stockingDate: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });

  const batchCode     = generateBatchCode(form.stockingDate, form.line);
  const filteredLines = lines.filter(l => l.speciesName === form.group && l.isActive !== false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const batchId = await generateBatchId();
      await Pond.update(pond.id, { stockingDate: form.stockingDate });
      const batch = await FishBatch.create({
        batchId, batchCode, group: form.group, line: form.line,
        currentTankId: pond.id, currentTankNumber: pond.number,
        stockingDate: form.stockingDate, breedingTankId: pond.id,
        notes: form.notes, isActive: true,
      });
      await AuditHistory.create({ entityType: 'FishBatch', entityId: batch.id, action: 'create', description: `Created batch ${batchCode} in tank ${pond.number}` });
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['batches-nursery', pond.id]);
      queryClient.invalidateQueries(['batches-growout', pond.id]);
      queryClient.invalidateQueries(['fishBatches']);
      onSuccess();
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add New Batch – Tank {pond.number}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Group (Species)</Label>
              <Select value={form.group} onValueChange={v => setForm({ ...form, group: v, line: '' })}>
                <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                <SelectContent>
                  {species.filter(s => s.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Line / Color</Label>
              <Select value={form.line} onValueChange={v => setForm({ ...form, line: v })} disabled={!form.group}>
                <SelectTrigger><SelectValue placeholder={form.group ? 'Select line' : 'Select species first'} /></SelectTrigger>
                <SelectContent>
                  {filteredLines.sort((a, b) => a.name.localeCompare(b.name)).map(l => (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Stocking Date</Label>
            <Input type="date" value={form.stockingDate} onChange={e => setForm({ ...form, stockingDate: e.target.value })} required />
          </div>
          <div>
            <Label>Batch Code (auto)</Label>
            <div className="p-2 border rounded-md bg-slate-50 text-sm font-mono text-teal-700">{batchCode || '—'}</div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
