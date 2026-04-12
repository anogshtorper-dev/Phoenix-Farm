// src/components/dashboard/PondDetailModal.jsx
// Changes: Removed base44 import.
//   base44.auth.me() → useAuth()
//   All entity calls: Species.list, Line.list, FishBatch.filter/update,
//   MetricAcknowledgment.filter/create, Pond.update, AuditHistory.create
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, Calendar, Plus, Truck, RotateCcw, Minus, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { Species, Line, FishBatch, MetricAcknowledgment, Pond, AuditHistory } from '@/api';
import AddBatchModal    from './AddBatchModal';
import PullBatchModal   from './PullBatchModal';
import TransferBatchModal from './TransferBatchModal';

const BATCH_COLORS = [
  { bg:'bg-sky-200',     text:'text-sky-900',     border:'border-sky-400'     },
  { bg:'bg-emerald-200', text:'text-emerald-900', border:'border-emerald-500' },
  { bg:'bg-pink-200',    text:'text-pink-900',    border:'border-pink-500'    },
  { bg:'bg-orange-200',  text:'text-orange-900',  border:'border-orange-500'  },
  { bg:'bg-purple-200',  text:'text-purple-900',  border:'border-purple-500'  },
  { bg:'bg-slate-300',   text:'text-slate-900',   border:'border-slate-500'   },
  { bg:'bg-yellow-200',  text:'text-yellow-900',  border:'border-yellow-500'  },
  { bg:'bg-red-200',     text:'text-red-900',     border:'border-red-500'     },
  { bg:'bg-teal-200',    text:'text-teal-900',    border:'border-teal-500'    },
  { bg:'bg-fuchsia-200', text:'text-fuchsia-900', border:'border-fuchsia-500' },
  { bg:'bg-lime-200',    text:'text-lime-900',    border:'border-lime-500'    },
  { bg:'bg-indigo-200',  text:'text-indigo-900',  border:'border-indigo-500'  },
];

function hashBatchCode(code) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return h % BATCH_COLORS.length;
}
function getBatchColor(c) { return BATCH_COLORS[hashBatchCode(c || '')]; }

function BreedingMultiSelect({ options, value, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen]         = useState(false);
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-white min-h-[38px] cursor-pointer" onClick={() => setOpen(o => !o)}>
        {value.length === 0 && <span className="text-slate-400 text-sm">{placeholder}</span>}
        {value.map((v, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
            {v}<button type="button" className="hover:text-red-500" onClick={e => { e.stopPropagation(); onChange(value.filter(x => x !== v)); }}>×</button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          <div className="p-1">
            <input className="w-full px-2 py-1 text-sm border rounded mb-1" placeholder="Search..." value={inputVal} onChange={e => setInputVal(e.target.value)} onClick={e => e.stopPropagation()} autoFocus />
          </div>
          {options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase())).map(opt => (
            <div key={opt} className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 flex items-center gap-2 ${value.includes(opt) ? 'bg-teal-50 font-medium' : ''}`} onClick={() => toggle(opt)}>
              <span className={`w-4 h-4 border rounded flex items-center justify-center text-xs ${value.includes(opt) ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>{value.includes(opt) ? '✓' : ''}</span>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parseQtyString(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.+?)\s*x(\d+)$/i);
    return m ? { name: m[1].trim(), qty: parseInt(m[2]) } : { name: s, qty: 1 };
  });
}
function serializeQtyArray(arr) { return arr.filter(i => i.qty > 0).map(i => `${i.name} x${i.qty}`).join(', '); }

function BreedingQuantitySelect({ options, value, onChange, placeholder, tagColor = 'teal' }) {
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen]         = useState(false);
  const isSelected = (opt) => value.some(v => v.name === opt);
  const getQty     = (opt) => value.find(v => v.name === opt)?.qty || 0;
  const toggle     = (opt) => isSelected(opt) ? onChange(value.filter(v => v.name !== opt)) : onChange([...value, { name: opt, qty: 1 }]);
  const changeQty  = (opt, d) => onChange(value.map(v => v.name === opt ? { ...v, qty: Math.max(1, v.qty + d) } : v));
  const remove     = (opt) => onChange(value.filter(v => v.name !== opt));
  const tagBg      = tagColor === 'purple' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800';
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-white min-h-[38px] cursor-pointer" onClick={() => setOpen(o => !o)}>
        {value.length === 0 && <span className="text-slate-400 text-sm">{placeholder}</span>}
        {value.map((v, i) => (
          <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tagBg}`}>
            {v.name}{v.qty > 1 ? ` x${v.qty}` : ''}
            <button type="button" className="hover:text-red-500 ml-0.5" onClick={e => { e.stopPropagation(); remove(v.name); }}>×</button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
          <div className="p-1">
            <input className="w-full px-2 py-1 text-sm border rounded mb-1" placeholder="Search..." value={inputVal} onChange={e => setInputVal(e.target.value)} onClick={e => e.stopPropagation()} autoFocus />
          </div>
          {options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase())).map(opt => (
            <div key={opt} className={`px-3 py-2 text-sm flex items-center gap-2 ${isSelected(opt) ? 'bg-teal-50' : 'hover:bg-slate-100'}`}>
              <span className={`w-4 h-4 border rounded flex items-center justify-center text-xs cursor-pointer flex-shrink-0 ${isSelected(opt) ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 hover:border-teal-400'}`} onClick={() => toggle(opt)}>{isSelected(opt) ? '✓' : ''}</span>
              <span className="flex-1 cursor-pointer font-medium" onClick={() => toggle(opt)}>{opt}</span>
              {isSelected(opt) && (
                <div className="flex items-center gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                  <button type="button" className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100 text-slate-600" onClick={() => changeQty(opt, -1)}><Minus className="w-3 h-3" /></button>
                  <span className="w-5 text-center text-sm font-bold text-teal-700">{getQty(opt)}</span>
                  <button type="button" className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100 text-slate-600" onClick={() => changeQty(opt, 1)}><Plus className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function calcUIA(tan, temp, ph) {
  if (tan == null || temp == null || ph == null) return null;
  const t = parseFloat(tan), T = parseFloat(temp), P = parseFloat(ph);
  if (isNaN(t) || isNaN(T) || isNaN(P)) return null;
  return t * (1 / (1 + Math.pow(10, 0.09018 + (2729.92 / (T + 273.15)) - P)));
}
function calcCO2(alkalinity, ph) {
  if (alkalinity == null || ph == null) return null;
  const alk = parseFloat(alkalinity), P = parseFloat(ph);
  if (isNaN(alk) || isNaN(P)) return null;
  return alk * Math.pow(10, 6.3 - P);
}

export default function PondDetailModal({ pond, groups, departments, systems, onClose, onUpdate, getPondStatus, defaultEditing = false }) {
  const { user }         = useAuth();
  const [isEditing,      setIsEditing]      = useState(defaultEditing);
  const [editedPond,     setEditedPond]     = useState(pond);
  const [showAddBatch,   setShowAddBatch]   = useState(false);
  const [showPullBatch,  setShowPullBatch]  = useState(false);
  const [transferringBatch, setTransferringBatch] = useState(null);
  const [dispatchingBatch,  setDispatchingBatch]  = useState(null);
  const [showResetConfirm,  setShowResetConfirm]  = useState(false);
  const [selectedBatchesToDelete, setSelectedBatchesToDelete] = useState([]);
  const queryClient = useQueryClient();

  const group      = groups.find(g => g.id === editedPond.groupId);
  const department = departments?.find(d => d.id === editedPond.departmentId);
  const system     = systems?.find(s => s.id === editedPond.systemId);
  const status     = getPondStatus(pond);
  const deptName   = department?.name || '';
  const isNursery  = deptName.toLowerCase().includes('nursery');
  const isBreeding = deptName.toLowerCase().includes('breed');
  const isGrowOut  = !isNursery && !isBreeding;

  const { data: speciesList = [] } = useQuery({ queryKey: ['species'], queryFn: () => Species.list() });
  const { data: linesList   = [] } = useQuery({ queryKey: ['lines'],   queryFn: () => Line.list() });

  const { data: growOutBatches = [] } = useQuery({
    queryKey: ['batches-growout', pond.id],
    queryFn:  () => FishBatch.filter({ currentTankId: pond.id, isActive: true }),
    enabled:  isGrowOut,
  });
  const { data: nurseryBatches = [] } = useQuery({
    queryKey: ['batches-nursery', pond.id],
    queryFn:  () => FishBatch.filter({ currentTankId: pond.id, isActive: true }),
    enabled:  isNursery,
  });
  const activeBatches = isGrowOut ? growOutBatches : isNursery ? nurseryBatches : [];

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ['acknowledgments', pond.id],
    queryFn:  () => MetricAcknowledgment.filter({ pondId: pond.id }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const uiaVal  = calcUIA(data.ammonia, data.temperature, data.ph);
      const co2Val  = calcCO2(data.alkalinity, data.ph);
      const updated = await Pond.update(pond.id, {
        ...data,
        ...(uiaVal !== null ? { uia: uiaVal } : {}),
        ...(co2Val !== null ? { co2: co2Val } : {}),
        lastUpdated: new Date().toISOString(),
      });
      await AuditHistory.create({ entityType: 'Pond', entityId: pond.id, action: 'update', description: `Updated tank ${pond.number}`, before: pond, after: updated });
      return updated;
    },
    onSuccess: (updated) => { setEditedPond(updated); onUpdate(); },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (metricType) => {
      const ack = await MetricAcknowledgment.create({ pondId: pond.id, metricType, acknowledgedAt: new Date().toISOString() });
      await AuditHistory.create({ entityType: 'MetricAcknowledgment', entityId: ack.id, action: 'create', description: `Acknowledged ${metricType} for tank ${pond.number}` });
      return ack;
    },
    onSuccess: () => onUpdate(),
  });

  const handleDispatchConfirm = async () => {
    if (!dispatchingBatch) return;
    await FishBatch.update(dispatchingBatch.id, { isActive: false });
    await AuditHistory.create({ entityType: 'FishBatch', entityId: dispatchingBatch.id, action: 'update', description: `Batch ${dispatchingBatch.batchCode} dispatched from tank ${pond.number}` });
    queryClient.invalidateQueries(['batches-growout', pond.id]);
    setDispatchingBatch(null);
    onUpdate();
  };

  const handleSave = () => {
    if (user?.role !== 'admin') { window.alert('Only administrators can edit pond data'); return; }
    updateMutation.mutate(editedPond, { onSuccess: () => setIsEditing(false) });
  };

  const handleAcknowledge = (metricType) => {
    if (user?.role !== 'admin') { window.alert('Only administrators can acknowledge metrics'); return; }
    acknowledgeMutation.mutate(metricType);
  };

  const isMetricAcknowledged = (mt) => acknowledgments.some(a => a.metricType === mt);
  const getMetricStatus = (value, min, max, mt) => {
    if (value == null) return null;
    if (isMetricAcknowledged(mt)) return 'acknowledged';
    if (min !== undefined && value < min) return 'low';
    if (max !== undefined && value > max) return 'high';
    return 'normal';
  };

  const MetricDisplay = ({ label, value, min, max, metricType, unit = '' }) => {
    const ms = getMetricStatus(value, min, max, metricType);
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2 border rounded-md bg-slate-50">{value != null ? `${value} ${unit}` : 'N/A'}</div>
          {(ms === 'low' || ms === 'high') && (
            <><AlertTriangle className="w-5 h-5 text-red-500" />
            <Button size="sm" variant="outline" onClick={() => handleAcknowledge(metricType)} disabled={user?.role !== 'admin'}>Acknowledge</Button></>
          )}
          {ms === 'acknowledged' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        </div>
        {group && min !== undefined && max !== undefined && <p className="text-xs text-slate-500">Range: {min} - {max} {unit}</p>}
      </div>
    );
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden fixed top-16 md:top-[50%] left-[50%] translate-x-[-50%] md:translate-y-[-50%] translate-y-0 max-h-[calc(100svh-4rem-env(safe-area-inset-bottom))] md:max-h-[90dvh]">
          <div className="flex-shrink-0 px-6 pt-4 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Tank {pond.number}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={status === 'normal' ? 'bg-green-500' : status === 'outdated' ? 'bg-orange-500' : 'bg-red-500'}>{status}</Badge>
                <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity p-1" aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-6">
              {status === 'outdated' && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>This tank hasn't been updated in over 7 days</AlertDescription></Alert>}

              {/* System + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>RAS System</Label>
                  {isEditing ? (
                    <Select value={editedPond.systemId} onValueChange={v => setEditedPond({ ...editedPond, systemId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                      <SelectContent>{systems?.map(s => <SelectItem key={s.id} value={s.id}>{s.systemName}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <p className="p-2 border rounded-md bg-slate-50">{system?.systemName || 'N/A'}</p>}
                </div>
                <div><Label>Department</Label>
                  {isEditing ? (
                    <Select value={editedPond.departmentId} onValueChange={v => setEditedPond({ ...editedPond, departmentId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments?.slice().sort((a, b) => a.name.localeCompare(b.name)).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <p className="p-2 border rounded-md bg-slate-50">{department?.name || 'N/A'}</p>}
                </div>
              </div>

              {/* Batch codes */}
              {!isBreeding && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Batch Codes in this tank</Label>
                    {isNursery && user?.role === 'admin' && <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-7 text-xs" onClick={() => setShowAddBatch(true)}><Plus className="w-3 h-3 mr-1" />Add New Batch</Button>}
                    {isGrowOut && user?.role === 'admin' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50 h-7 text-xs" onClick={() => setShowAddBatch(true)}><Plus className="w-3 h-3 mr-1" />Add New Batch</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => setShowPullBatch(true)}>Pull Batch</Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                    {activeBatches.length > 0
                      ? activeBatches.map(b => {
                          const c = getBatchColor(b.batchCode);
                          return (
                            <button key={b.id} onClick={() => setTransferringBatch(b)} className={`px-2 py-1 rounded-full text-sm font-mono font-medium cursor-pointer hover:opacity-80 transition-opacity border ${c.bg} ${c.text} ${c.border}`}>
                              {b.batchCode}
                            </button>
                          );
                        })
                      : <span className="text-slate-400 text-sm">No batches yet</span>}
                  </div>
                </div>
              )}

              {/* Group + Line (non-breeding) */}
              {!isBreeding && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Group (Species)</Label>
                    <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                      {activeBatches.length > 0 ? activeBatches.filter(b => b.group).map(b => { const c = getBatchColor(b.batchCode); return <span key={b.id} className={`px-2 py-1 rounded-full text-sm font-medium border ${c.bg} ${c.text} ${c.border}`}>{b.group}</span>; }) : <span className="text-slate-400 text-sm">N/A</span>}
                    </div>
                  </div>
                  <div><Label>Line / Color</Label>
                    <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                      {activeBatches.length > 0 ? activeBatches.filter(b => b.line).map(b => { const c = getBatchColor(b.batchCode); return <span key={b.id} className={`px-2 py-1 rounded-full text-sm font-medium border ${c.bg} ${c.text} ${c.border}`}>{b.line}</span>; }) : <span className="text-slate-400 text-sm">N/A</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Breeding species + line */}
              {isBreeding && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Group (Species)</Label>
                    {isEditing ? (
                      <BreedingQuantitySelect options={speciesList.filter(s => s.isActive !== false).sort((a,b) => a.name.localeCompare(b.name)).map(s => s.name)} value={parseQtyString(editedPond.species)} onChange={items => setEditedPond({ ...editedPond, species: serializeQtyArray(items) })} placeholder="Select groups..." tagColor="teal" />
                    ) : (
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                        {editedPond.species ? parseQtyString(editedPond.species).map((item, i) => <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-sm">{item.name}{item.qty > 1 ? ` x${item.qty}` : ''}</span>) : <span className="text-slate-400 text-sm">N/A</span>}
                      </div>
                    )}
                  </div>
                  <div><Label>Line / Color</Label>
                    {isEditing ? (
                      <BreedingQuantitySelect
                        options={(() => { const sel = parseQtyString(editedPond.species).map(i => i.name); const filtered = sel.length > 0 ? linesList.filter(l => sel.includes(l.speciesName)) : linesList; return filtered.sort((a,b) => a.name.localeCompare(b.name)).map(l => l.name); })()}
                        value={parseQtyString(editedPond.strainOrLine)} onChange={items => setEditedPond({ ...editedPond, strainOrLine: serializeQtyArray(items) })} placeholder="Select lines..." tagColor="purple"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                        {editedPond.strainOrLine ? parseQtyString(editedPond.strainOrLine).map((item, i) => <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-sm">{item.name}{item.qty > 1 ? ` x${item.qty}` : ''}</span>) : <span className="text-slate-400 text-sm">N/A</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stocking date */}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Stocking Date {!isBreeding && <span className="text-xs text-slate-400">(from batches)</span>}</Label>
                  {isBreeding ? (
                    isEditing ? <Input type="date" value={editedPond.stockingDate || ''} onChange={e => setEditedPond({ ...editedPond, stockingDate: e.target.value })} />
                    : <p className="p-2 border rounded-md bg-slate-50">{editedPond.stockingDate || 'N/A'}</p>
                  ) : (
                    <p className="p-2 border rounded-md bg-slate-50">{activeBatches.length > 0 ? activeBatches.map(b => b.stockingDate).filter(Boolean).sort().at(-1) || 'N/A' : 'N/A'}</p>
                  )}
                </div>
              </div>

              {/* Breeding males/females */}
              {isBreeding && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Males</Label>{isEditing ? <Input type="number" value={editedPond.malesCount || ''} onChange={e => setEditedPond({ ...editedPond, malesCount: parseInt(e.target.value) || 0 })} /> : <p className="p-2 border rounded-md bg-slate-50">{editedPond.malesCount ?? 'N/A'}</p>}</div>
                  <div><Label>Females</Label>{isEditing ? <Input type="number" value={editedPond.femalesCount || ''} onChange={e => setEditedPond({ ...editedPond, femalesCount: parseInt(e.target.value) || 0 })} /> : <p className="p-2 border rounded-md bg-slate-50">{editedPond.femalesCount ?? 'N/A'}</p>}</div>
                </div>
              )}

              {/* Nursery density */}
              {isNursery && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Density</Label>
                    {isEditing ? (
                      <Select value={editedPond.density || ''} onValueChange={v => setEditedPond({ ...editedPond, density: v })}>
                        <SelectTrigger><SelectValue placeholder="Select density" /></SelectTrigger>
                        <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                      </Select>
                    ) : <p className="p-2 border rounded-md bg-slate-50">{editedPond.density || 'N/A'}</p>}
                  </div>
                </div>
              )}

              {/* Breeding clean */}
              {isBreeding && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Clean</Label>
                    {isEditing ? (
                      <Select value={editedPond.tankClean || ''} onValueChange={v => setEditedPond({ ...editedPond, tankClean: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                      </Select>
                    ) : <p className="p-2 border rounded-md bg-slate-50">{editedPond.tankClean || 'N/A'}</p>}
                  </div>
                  {(editedPond.tankClean === 'Yes' || (!isEditing && pond.tankClean === 'Yes')) && (
                    <div><Label>Clean Date</Label>
                      {isEditing ? <Input type="date" value={editedPond.tankCleanDate || ''} onChange={e => setEditedPond({ ...editedPond, tankCleanDate: e.target.value })} />
                      : <p className="p-2 border rounded-md bg-slate-50">{editedPond.tankCleanDate || 'N/A'}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Grow-out specific */}
              {isGrowOut && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Stage</Label>
                    {isEditing ? (
                      <Select value={editedPond.stage || ''} onValueChange={v => setEditedPond({ ...editedPond, stage: v })}>
                        <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                        <SelectContent><SelectItem value="fry">Fry</SelectItem><SelectItem value="juvenile">Juvenile</SelectItem><SelectItem value="stock">Stock</SelectItem></SelectContent>
                      </Select>
                    ) : <p className="p-2 border rounded-md bg-slate-50 capitalize">{editedPond.stage || 'N/A'}</p>}
                  </div>
                  <div><Label>Size (cm)</Label>
                    {isEditing ? (
                      <BreedingMultiSelect
                        options={['2-2.5','2.5-3','3-3.5','3.5-4','4-5','5-6','6-7','7-8','8-9','9-10','10-12']}
                        value={editedPond.fishSize ? String(editedPond.fishSize).split(',').map(s => s.trim()).filter(Boolean) : []}
                        onChange={vals => setEditedPond({ ...editedPond, fishSize: vals.join(', ') })}
                        placeholder="Select size ranges..."
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-slate-50 min-h-[38px]">
                        {editedPond.fishSize ? String(editedPond.fishSize).split(',').map(s => s.trim()).filter(Boolean).map((s, i) => <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm">{s} cm</span>) : <span className="text-slate-400 text-sm">N/A</span>}
                      </div>
                    )}
                  </div>
                  <div><Label>Density</Label>
                    {isEditing ? (
                      <Select value={editedPond.density || ''} onValueChange={v => setEditedPond({ ...editedPond, density: v })}>
                        <SelectTrigger><SelectValue placeholder="Select density" /></SelectTrigger>
                        <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                      </Select>
                    ) : <p className="p-2 border rounded-md bg-slate-50">{editedPond.density || 'N/A'}</p>}
                  </div>
                  <div><Label>For Sale</Label>
                    {isEditing ? (
                      <Select value={editedPond.forSale || ''} onValueChange={v => setEditedPond({ ...editedPond, forSale: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                      </Select>
                    ) : <p className="p-2 border rounded-md bg-slate-50">{editedPond.forSale || 'N/A'}</p>}
                  </div>
                </div>
              )}

              {pond.lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />Last updated: {format(new Date(pond.lastUpdated), 'PPpp')}
                </div>
              )}

              {/* Tasks & Notes */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">Tasks & Notes</h3>
                <div className="space-y-4">
                  <div><Label>Required Task</Label>
                    {isEditing ? <Input value={editedPond.requiredTask || ''} onChange={e => setEditedPond({ ...editedPond, requiredTask: e.target.value })} />
                    : <p className="p-2 border rounded-md bg-slate-50">{editedPond.requiredTask || 'None'}</p>}
                  </div>
                  <div><Label>Notes</Label>
                    {isEditing ? <Textarea value={editedPond.notes || ''} onChange={e => setEditedPond({ ...editedPond, notes: e.target.value })} rows={3} />
                    : <p className="p-2 border rounded-md bg-slate-50 min-h-[60px]">{editedPond.notes || 'No notes'}</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setShowResetConfirm(true)} className="text-red-600 border-red-300 hover:bg-red-50"><RotateCcw className="w-4 h-4 mr-2" />Reset Tank</Button>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => { setIsEditing(false); setEditedPond(pond); }}>Cancel</Button>
                      <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">Save Changes</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div />
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={onClose}>Close</Button>
                      {user?.role === 'admin' && <Button onClick={() => setIsEditing(true)} className="bg-teal-600 hover:bg-teal-700">Edit Tank</Button>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAddBatch && <AddBatchModal pond={pond} onClose={() => setShowAddBatch(false)} onSuccess={() => { setShowAddBatch(false); setIsEditing(true); onUpdate(); }} />}
      {showPullBatch && <PullBatchModal pond={pond} onClose={() => setShowPullBatch(false)} onSuccess={() => { setShowPullBatch(false); onUpdate(); }} />}
      {transferringBatch && <TransferBatchModal batch={transferringBatch} systems={systems} onClose={() => setTransferringBatch(null)} onSuccess={() => { setTransferringBatch(null); onUpdate(); }} />}

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={open => { setShowResetConfirm(open); if (!open) setSelectedBatchesToDelete([]); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Tank</AlertDialogTitle>
            <AlertDialogDescription>This will clear all tank fields. RAS System and Department will not be changed.</AlertDialogDescription>
          </AlertDialogHeader>
          {activeBatches.length > 0 && (
            <div className="py-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Batches to delete:</p>
                <button type="button" className="text-xs text-teal-600 hover:underline" onClick={() => {
                  setSelectedBatchesToDelete(selectedBatchesToDelete.length === activeBatches.length ? [] : activeBatches.map(b => b.id));
                }}>
                  {selectedBatchesToDelete.length === activeBatches.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                {activeBatches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded hover:bg-slate-50">
                    <input type="checkbox" checked={selectedBatchesToDelete.includes(b.id)} onChange={e => setSelectedBatchesToDelete(prev => e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id))} className="w-4 h-4 accent-teal-600" />
                    <span className="font-mono text-sm font-medium">{b.batchCode}</span>
                    <span className="text-xs text-slate-500">{b.group} – {b.line}</span>
                  </label>
                ))}
              </div>
              {selectedBatchesToDelete.length > 0 && <p className="text-xs text-red-600">{selectedBatchesToDelete.length} batch(es) will be permanently deleted.</p>}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const resetData = {
                  species: '', strainOrLine: '', stockingDate: '', transferDate: '',
                  destinationTankNumber: '', batchCode: '', density: '', stockingDensity: null,
                  stage: '', fishSize: null, forSale: '', malesCount: null, femalesCount: null,
                  tankClean: '', tankCleanDate: '', requiredTask: '', notes: '',
                  groupId: '', fishCount: null, tankStatus: 'Empty',
                };
                await Pond.update(pond.id, resetData);
                await AuditHistory.create({ entityType: 'Pond', entityId: pond.id, action: 'update', description: `Reset tank ${pond.number}`, before: pond, after: { ...pond, ...resetData } });
                for (const batchId of selectedBatchesToDelete) {
                  await FishBatch.update(batchId, { isActive: false });
                }
                setEditedPond({ ...pond, ...resetData });
                setSelectedBatchesToDelete([]);
                setShowResetConfirm(false);
                setIsEditing(false);
                queryClient.invalidateQueries(['batches-growout', pond.id]);
                queryClient.invalidateQueries(['batches-nursery', pond.id]);
                onUpdate();
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Reset Tank
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dispatch confirmation */}
      <AlertDialog open={!!dispatchingBatch} onOpenChange={open => { if (!open) setDispatchingBatch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Batch Dispatch</AlertDialogTitle>
            <AlertDialogDescription>Mark batch <strong>{dispatchingBatch?.batchCode}</strong> ({dispatchingBatch?.group} – {dispatchingBatch?.line}) as dispatched? This will remove it from pond {pond.number}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDispatchConfirm} className="bg-orange-500 hover:bg-orange-600">Yes, Dispatch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
