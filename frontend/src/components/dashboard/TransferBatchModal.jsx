// src/components/dashboard/TransferBatchModal.jsx
// Changes: Removed base44 import. Department.list, Pond.list, FishBatch.update/filter,
// Pond.update, AuditHistory.create replace all entity calls.
import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowRight, Truck, ChevronDown, X, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Department, Pond, FishBatch, AuditHistory } from '@/api';

function SearchCombobox({ label, items, value, onSelect, placeholder, disabled }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref      = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  const selected = items.find(i => i.value === value);
  return (
    <div ref={ref} className="relative">
      <Label className="mb-1 block">{label}</Label>
      <div className={`flex items-center border rounded-md bg-white px-3 h-9 cursor-text ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
        {open ? (
          <input ref={inputRef} className="flex-1 outline-none text-sm bg-transparent" placeholder={placeholder} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        )}
        {value && !open ? <X className="w-3 h-3 text-slate-400 hover:text-slate-700 ml-1 shrink-0" onClick={e => { e.stopPropagation(); onSelect(''); setSearch(''); }} /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? <div className="px-3 py-2 text-sm text-slate-400">No results</div>
            : filtered.map(item => (
                <div key={item.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${item.value === value ? 'bg-teal-50 font-medium text-teal-700' : ''}`}
                  onMouseDown={() => { onSelect(item.value); setSearch(''); setOpen(false); }}>
                  {item.label}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

export default function TransferBatchModal({ batch, systems, onClose, onSuccess }) {
  const [selectedSystemId,    setSelectedSystemId]    = useState('');
  const [selectedDeptId,      setSelectedDeptId]      = useState('');
  const [selectedPondId,      setSelectedPondId]      = useState('');
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);
  const [showDeleteConfirm,   setShowDeleteConfirm]   = useState(false);
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => Department.list() });
  const { data: ponds       = [] } = useQuery({ queryKey: ['ponds'],       queryFn: () => Pond.list() });

  const resetPondIfEmpty = async (pondId, deptName) => {
    const isNursery = deptName?.toLowerCase().includes('nursery');
    const isGrowOut = !isNursery && !deptName?.toLowerCase().includes('breed');
    if (!isNursery && !isGrowOut) return;
    await Pond.update(pondId, {
      species: '', strainOrLine: '', stockingDate: '', transferDate: '',
      destinationTankNumber: '', batchCode: '', density: '', stockingDensity: null,
      stage: '', fishSize: null, forSale: '', malesCount: null, femalesCount: null,
      tankClean: '', tankCleanDate: '', requiredTask: '', notes: '',
      groupId: '', fishCount: null, tankStatus: 'Empty',
    });
  };

  const validDestPonds = ponds.filter(p => {
    const dept = departments.find(d => d.id === p.departmentId);
    return dept?.name?.toLowerCase().includes('grow') && p.id !== batch.currentTankId;
  });

  const handlePondSelect = (pondId) => {
    setSelectedPondId(pondId);
    if (pondId) {
      const p = ponds.find(x => x.id === pondId);
      if (p) { setSelectedSystemId(p.systemId || ''); setSelectedDeptId(p.departmentId || ''); }
    }
  };
  const handleSystemSelect = (sysId) => {
    setSelectedSystemId(sysId);
    const p = ponds.find(x => x.id === selectedPondId);
    if (p && p.systemId !== sysId) { setSelectedPondId(''); setSelectedDeptId(''); }
  };
  const handleDeptSelect = (deptId) => {
    setSelectedDeptId(deptId);
    const p = ponds.find(x => x.id === selectedPondId);
    if (p && p.departmentId !== deptId) setSelectedPondId('');
  };

  const filteredSystemItems = (() => {
    const ids = new Set(validDestPonds.filter(p => !selectedDeptId || p.departmentId === selectedDeptId).map(p => p.systemId).filter(Boolean));
    return (systems || []).filter(s => ids.has(s.id)).map(s => ({ value: s.id, label: s.systemName }));
  })();
  const filteredDeptItems = (() => {
    const ids = new Set(validDestPonds.filter(p => !selectedSystemId || p.systemId === selectedSystemId).map(p => p.departmentId).filter(Boolean));
    return departments.filter(d => ids.has(d.id)).map(d => ({ value: d.id, label: d.name }));
  })();
  const filteredPondItems = validDestPonds
    .filter(p => (!selectedSystemId || p.systemId === selectedSystemId) && (!selectedDeptId || p.departmentId === selectedDeptId))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    .map(p => ({ value: p.id, label: `Tank ${p.number}` }));

  const transferMutation = useMutation({
    mutationFn: async () => {
      const targetPond    = ponds.find(p => p.id === selectedPondId);
      const transferDate  = new Date().toISOString().split('T')[0];
      const updated = await FishBatch.update(batch.id, { currentTankId: selectedPondId, currentTankNumber: targetPond.number, transferDate });
      await AuditHistory.create({
        entityType: 'FishBatch', entityId: batch.id, action: 'transfer',
        description: `Transferred batch ${batch.batchCode} from tank ${batch.currentTankNumber} to tank ${targetPond.number}`,
        before: { currentTankId: batch.currentTankId, currentTankNumber: batch.currentTankNumber },
        after:  { currentTankId: selectedPondId, currentTankNumber: targetPond.number },
      });
      const remaining = await FishBatch.filter({ currentTankId: batch.currentTankId, isActive: true });
      if (remaining.length === 0) {
        const srcPond = ponds.find(p => p.id === batch.currentTankId);
        const srcDept = departments.find(d => d.id === srcPond?.departmentId);
        await resetPondIfEmpty(batch.currentTankId, srcDept?.name);
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches-nursery'] });
      queryClient.invalidateQueries({ queryKey: ['batches-growout'] });
      onSuccess();
    },
  });

  const handleDispatchConfirm = async () => {
    await FishBatch.update(batch.id, { isActive: false });
    await AuditHistory.create({ entityType: 'FishBatch', entityId: batch.id, action: 'update', description: `Batch ${batch.batchCode} dispatched from tank ${batch.currentTankNumber}` });
    const remaining = await FishBatch.filter({ currentTankId: batch.currentTankId, isActive: true });
    if (remaining.length === 0) {
      const srcPond = ponds.find(p => p.id === batch.currentTankId);
      const srcDept = departments.find(d => d.id === srcPond?.departmentId);
      await resetPondIfEmpty(batch.currentTankId, srcDept?.name);
    }
    queryClient.invalidateQueries({ queryKey: ['batches-growout'] });
    setShowDispatchConfirm(false);
    onSuccess();
  };

  const handleDeleteBatch = async () => {
    await FishBatch.update(batch.id, { isActive: false });
    await AuditHistory.create({ entityType: 'FishBatch', entityId: batch.id, action: 'delete', description: `Deleted batch ${batch.batchCode} from tank ${batch.currentTankNumber}` });
    const remaining = await FishBatch.filter({ currentTankId: batch.currentTankId, isActive: true });
    if (remaining.length === 0) {
      const srcPond = ponds.find(p => p.id === batch.currentTankId);
      const srcDept = departments.find(d => d.id === srcPond?.departmentId);
      await resetPondIfEmpty(batch.currentTankId, srcDept?.name);
    }
    queryClient.invalidateQueries({ queryKey: ['batches-growout'] });
    queryClient.invalidateQueries({ queryKey: ['batches-nursery'] });
    queryClient.invalidateQueries({ queryKey: ['fishBatches'] });
    onSuccess();
  };

  const sourcePond  = ponds.find(p => p.id === batch.currentTankId);
  const sourceSystem = systems?.find(s => s.id === sourcePond?.systemId);
  const sourceDept  = departments.find(d => d.id === sourcePond?.departmentId);
  const targetPond  = ponds.find(p => p.id === selectedPondId);
  const targetSystem = systems?.find(s => s.id === targetPond?.systemId);
  const targetDept  = departments.find(d => d.id === targetPond?.departmentId);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transfer Batch: {batch.batchCode}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-slate-900">Batch Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-600">ID:</span> <span className="font-mono font-semibold">{batch.batchId}</span></div>
                <div><span className="text-slate-600">Code:</span> <span className="font-mono font-semibold">{batch.batchCode}</span></div>
                <div><span className="text-slate-600">Group:</span> <span>{batch.group}</span></div>
                <div><span className="text-slate-600">Line:</span> <span>{batch.line}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-700">From</h4>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-1 text-sm">
                  <div><span className="text-slate-600">System:</span> {sourceSystem?.systemName}</div>
                  <div><span className="text-slate-600">Dept:</span> {sourceDept?.name}</div>
                  <div><span className="font-mono font-semibold text-blue-700">Tank {sourcePond?.number}</span></div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-700">To</h4>
                {selectedPondId ? (
                  <div className="bg-green-50 p-3 rounded border border-green-200 space-y-1 text-sm">
                    <div><span className="text-slate-600">System:</span> {targetSystem?.systemName}</div>
                    <div><span className="text-slate-600">Dept:</span> {targetDept?.name}</div>
                    <div><span className="font-mono font-semibold text-green-700">Tank {targetPond?.number}</span></div>
                  </div>
                ) : (
                  <div className="bg-slate-100 p-3 rounded border border-slate-300 text-slate-400 text-sm">Select destination</div>
                )}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <SearchCombobox label="RAS System"   items={filteredSystemItems} value={selectedSystemId} onSelect={handleSystemSelect} placeholder="Search or select system..." />
              <SearchCombobox label="Department"   items={filteredDeptItems}   value={selectedDeptId}   onSelect={handleDeptSelect}   placeholder="Search or select department..." />
              <SearchCombobox label="Tank / Pool"  items={filteredPondItems}   value={selectedPondId}   onSelect={handlePondSelect}   placeholder="Search or select tank..." />
            </div>
            <div className="flex justify-between gap-3 pt-4 border-t">
              <div className="flex gap-2">
                {sourceDept?.name?.toLowerCase().includes('grow-out') && (
                  <Button variant="outline" onClick={() => setShowDispatchConfirm(true)} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                    <Truck className="w-4 h-4 mr-2" />Dispatch
                  </Button>
                )}
                {!showDeleteConfirm ? (
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 border-red-300 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />Delete Batch
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-md px-3 py-1">
                    <span className="text-sm text-red-700 font-medium">Are you sure?</span>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 h-7 text-xs" onClick={handleDeleteBatch}>Yes, Delete</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>No</Button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => transferMutation.mutate()} disabled={!selectedSystemId || !selectedDeptId || !selectedPondId || transferMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  <ArrowRight className="w-4 h-4 mr-2" />Transfer Batch
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showDispatchConfirm} onOpenChange={setShowDispatchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Dispatch</AlertDialogTitle>
            <AlertDialogDescription>Mark batch <strong>{batch.batchCode}</strong> ({batch.group} – {batch.line}) as dispatched? This will remove it from the pond.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDispatchConfirm} className="bg-orange-500 hover:bg-orange-600">Confirm Dispatch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
