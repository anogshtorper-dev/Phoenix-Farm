// src/components/dashboard/PullBatchModal.jsx
// Changes: Removed base44 import. RASSystem.list, Pond.list, Department.list,
// FishBatch.filter/update, Pond.update replace all entity calls.
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X } from 'lucide-react';
import { RASSystem, Pond, Department, FishBatch } from '@/api';

function SearchableSelect({ value, onChange, options, placeholder, renderLabel }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered       = options.filter(o => renderLabel(o).toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(o => o.id === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? renderLabel(selectedOption) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }} />}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <Input autoFocus className="h-8 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <div className="py-4 text-center text-sm text-slate-400">No results</div>
              : filtered.map(o => (
                  <button key={o.id} type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${value === o.id ? 'bg-teal-50 text-teal-800 font-medium' : 'text-slate-700'}`}
                    onClick={() => { onChange(o.id); setOpen(false); setSearch(''); }}>
                    {renderLabel(o)}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function PullBatchModal({ pond, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [selectedPondId,   setSelectedPondId]   = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);

  const { data: systems        = [] } = useQuery({ queryKey: ['systems'],           queryFn: () => RASSystem.list() });
  const { data: allPonds       = [] } = useQuery({ queryKey: ['ponds-all'],         queryFn: () => Pond.list() });
  const { data: departments    = [] } = useQuery({ queryKey: ['departments'],       queryFn: () => Department.list() });
  const { data: allActiveBatches = [] } = useQuery({ queryKey: ['batches-all-active'], queryFn: () => FishBatch.filter({ isActive: true }) });
  const { data: sourceBatches  = [] } = useQuery({
    queryKey: ['batches-source', selectedPondId],
    queryFn:  () => FishBatch.filter({ currentTankId: selectedPondId, isActive: true }),
    enabled:  !!selectedPondId,
  });

  const validSourceDeptIds = departments
    .filter(d => { const n = d.name?.toLowerCase() || ''; return n.includes('nursery') || n.includes('grow'); })
    .map(d => d.id);

  const pondsWithBatches = new Set(allActiveBatches.map(b => b.currentTankId).filter(Boolean));

  const filteredPonds = allPonds.filter(p =>
    p.id !== pond.id &&
    validSourceDeptIds.includes(p.departmentId) &&
    pondsWithBatches.has(p.id) &&
    (selectedSystemId ? p.systemId === selectedSystemId : true)
  );

  const handlePondSelect = (pondId) => {
    setSelectedPondId(pondId);
    setSelectedBatchIds([]);
    const p = allPonds.find(x => x.id === pondId);
    if (p?.systemId) setSelectedSystemId(p.systemId);
  };

  const toggleBatch = (id) => setSelectedBatchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const resetPondFields = async (pondId, deptName) => {
    const isNursery = deptName?.toLowerCase().includes('nursery');
    const isGrowOut = !isNursery && !deptName?.toLowerCase().includes('breed');
    if (!isNursery && !isGrowOut) return;
    const resetData = {
      species: '', strainOrLine: '', stockingDate: '', transferDate: '',
      destinationTankNumber: '', batchCode: '', density: '', stockingDensity: null,
      stage: '', fishSize: null, forSale: '', malesCount: null, femalesCount: null,
      tankClean: '', tankCleanDate: '', requiredTask: '', notes: '',
      groupId: '', fishCount: null, tankStatus: 'Empty',
    };
    await Pond.update(pondId, resetData);
  };

  const moveMutation = useMutation({
    mutationFn: async () => {
      const transferDate = new Date().toISOString().split('T')[0];
      const [, mm, dd]   = transferDate.split('-');
      await Promise.all(selectedBatchIds.map(batchId => {
        const batch      = sourceBatches.find(b => b.id === batchId);
        const linePrefix = (batch?.line || '').substring(0, 3);
        const newCode    = `${dd}${mm}${linePrefix}`;
        return FishBatch.update(batchId, {
          currentTankId: pond.id, currentTankNumber: pond.number,
          transferDate, stockingDate: transferDate, batchCode: newCode,
        });
      }));
      const remaining = sourceBatches.filter(b => !selectedBatchIds.includes(b.id));
      if (remaining.length === 0 && selectedPondId) {
        const src  = allPonds.find(p => p.id === selectedPondId);
        const dept = departments.find(d => d.id === src?.departmentId);
        await resetPondFields(selectedPondId, dept?.name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['batches-source', selectedPondId]);
      queryClient.invalidateQueries(['batches-growout', pond.id]);
      queryClient.invalidateQueries(['batches-nursery', pond.id]);
      queryClient.invalidateQueries(['batches-nursery', selectedPondId]);
      queryClient.invalidateQueries(['batches-growout', selectedPondId]);
      onSuccess();
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Pull Batch – Tank {pond.number}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>System</Label>
            <SearchableSelect
              value={selectedSystemId}
              onChange={v => { setSelectedSystemId(v); setSelectedPondId(''); setSelectedBatchIds([]); }}
              options={systems.filter(s => s.isActive !== false).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))}
              placeholder="Select system (optional)"
              renderLabel={s => s.systemName}
            />
          </div>
          <div>
            <Label>Source Tank</Label>
            <SearchableSelect
              value={selectedPondId}
              onChange={handlePondSelect}
              options={filteredPonds.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))}
              placeholder="Select tank"
              renderLabel={p => `${p.number}${p.species ? ` – ${p.species}` : ''}`}
            />
          </div>
          {selectedPondId && (
            <div>
              <Label>Select Batches</Label>
              {sourceBatches.length === 0 ? (
                <p className="text-sm text-slate-400 mt-1">No active batches in this tank</p>
              ) : (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {sourceBatches.map(batch => (
                    <div key={batch.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                      <Checkbox id={batch.id} checked={selectedBatchIds.includes(batch.id)} onCheckedChange={() => toggleBatch(batch.id)} />
                      <label htmlFor={batch.id} className="flex-1 cursor-pointer text-sm">
                        <span className="font-mono text-teal-700 font-semibold">{batch.batchCode}</span>
                        <span className="text-slate-600 ml-2">{batch.group} – {batch.line}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={selectedBatchIds.length === 0 || moveMutation.isPending} onClick={() => moveMutation.mutate()}>
              {moveMutation.isPending ? 'Moving...' : `Pull ${selectedBatchIds.length > 0 ? `(${selectedBatchIds.length})` : ''} Batch`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
