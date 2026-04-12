// src/pages/GroupView.jsx
// Changes: Removed base44 import. All 5 entity calls replaced with named API imports.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Department, PondGroup, Pond, RASSystem, FishBatch } from '@/api';
import PondDetailModal from '../components/dashboard/PondDetailModal';
import MultiSelectCombobox from '../components/ui/MultiSelectCombobox';

const SORT_OPTIONS = [
  { key: 'tank_asc',     label: 'Tank ↑ (A→Z)',        icon: ArrowUp   },
  { key: 'tank_desc',    label: 'Tank ↓ (Z→A)',        icon: ArrowDown },
  { key: 'groups_asc',   label: 'Groups ↑ (A→Z)',      icon: ArrowUp   },
  { key: 'groups_desc',  label: 'Groups ↓ (Z→A)',      icon: ArrowDown },
  { key: 'line_asc',     label: 'Line ↑ (A→Z)',        icon: ArrowUp   },
  { key: 'line_desc',    label: 'Line ↓ (Z→A)',        icon: ArrowDown },
  { key: 'size_asc',     label: 'Size ↑ (A→Z)',        icon: ArrowUp   },
  { key: 'size_desc',    label: 'Size ↓ (Z→A)',        icon: ArrowDown },
  { key: 'updated_asc',  label: 'Updated ↑ (Old→New)', icon: ArrowUp   },
  { key: 'updated_desc', label: 'Updated ↓ (New→Old)', icon: ArrowDown },
];

function smartNum(str) {
  if (!str) return [''];
  return str.split(/(\d+)/).map((s, i) => i % 2 === 1 ? parseInt(s, 10) : s.toLowerCase());
}
function smartCompare(a, b) {
  const ta = smartNum(a), tb = smartNum(b);
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    const av = ta[i] ?? '', bv = tb[i] ?? '';
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

export default function GroupView() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('all');
  const [selectedFishType,     setSelectedFishType]     = useState('all');
  const [selectedSystemId,     setSelectedSystemId]     = useState('all');
  const [forSaleFilter,        setForSaleFilter]        = useState('all');
  const [searchTerm,           setSearchTerm]           = useState('');
  const [selectedPond,         setSelectedPond]         = useState(null);
  const [sortKey,              setSortKey]              = useState(null);
  const [sortOpen,             setSortOpen]             = useState(false);

  const [colFilters, setColFilters] = useState({
    pond: [], department: [], groups: [], line: [], status: [], notes: [],
  });

  const { data: departments = [] }           = useQuery({ queryKey: ['departments'],   queryFn: () => Department.list() });
  const { data: groups = [] }                = useQuery({ queryKey: ['groups'],        queryFn: () => PondGroup.list() });
  const { data: ponds = [], refetch: refetchPonds } = useQuery({ queryKey: ['ponds'], queryFn: () => Pond.list() });
  const { data: systems = [] }               = useQuery({ queryKey: ['systems'],       queryFn: () => RASSystem.list() });
  const { data: batches = [] }               = useQuery({ queryKey: ['batches-all'],   queryFn: () => FishBatch.filter({ isActive: true }) });

  const batchesByPond = useMemo(() => {
    const map = {};
    for (const b of batches) {
      if (b.currentTankId) {
        if (!map[b.currentTankId]) map[b.currentTankId] = [];
        map[b.currentTankId].push(b);
      }
    }
    return map;
  }, [batches]);

  const allFishTypes = useMemo(() =>
    [...new Set(batches.map(b => b.group).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [batches]);

  const getPondStatus = (pond) => {
    if (!pond.lastUpdated) return 'outdated';
    const days = (Date.now() - new Date(pond.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 7) return 'outdated';
    const group = groups.find(g => g.id === pond.groupId);
    if (!group) return 'normal';
    const metrics = [
      { value: pond.temperature, min: group.tempMin,    max: group.tempMax    },
      { value: pond.ph,          min: group.phMin,      max: group.phMax      },
      { value: pond.salinity,    min: group.salinityMin,max: group.salinityMax},
    ];
    for (const m of metrics) {
      if (m.value != null) {
        if (m.min != null && m.value < m.min) return 'abnormal';
        if (m.max != null && m.value > m.max) return 'abnormal';
      }
    }
    return 'normal';
  };

  const enrichedPonds = useMemo(() =>
    ponds.filter(p => p.isActive !== false).map(pond => {
      const pondBatches  = batchesByPond[pond.id] || [];
      const fishTypes    = [...new Set(pondBatches.map(b => b.group).filter(Boolean))];
      const lines        = [...new Set(pondBatches.map(b => b.line).filter(Boolean))];
      const dept         = departments.find(d => d.id === pond.departmentId);
      return {
        ...pond,
        _dept:         dept?.name || '',
        _fishTypes:    fishTypes,
        _fishTypesStr: fishTypes.join(', ') || pond.species || '—',
        _lines:        lines,
        _linesStr:     lines.join(', ') || pond.strainOrLine || '—',
        _status:       getPondStatus(pond),
        _batchCount:   pondBatches.length,
      };
    }),
    [ponds, batchesByPond, departments, groups]);

  const colOptions = useMemo(() => ({
    pond:       [...new Set(enrichedPonds.map(p => p.number).filter(Boolean))].sort(),
    department: [...new Set(enrichedPonds.map(p => p._dept).filter(Boolean))].sort(),
    groups:     [...new Set(enrichedPonds.flatMap(p => p._fishTypes))].sort(),
    line:       [...new Set(enrichedPonds.flatMap(p => p._lines))].sort(),
    status:     ['normal', 'outdated', 'abnormal'],
    notes:      [...new Set(enrichedPonds.map(p => p.notes).filter(Boolean))].sort(),
  }), [enrichedPonds]);

  const setColFilter = (col, val) => setColFilters(f => ({ ...f, [col]: val }));

  useEffect(() => {
    if (!sortOpen) return;
    const handle = () => setSortOpen(false);
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [sortOpen]);

  const filteredPonds = enrichedPonds.filter(pond => {
    if (selectedDepartmentId !== 'all' && pond.departmentId !== selectedDepartmentId) return false;
    if (selectedSystemId     !== 'all' && pond.systemId     !== selectedSystemId)     return false;
    if (searchTerm && !pond.number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedFishType !== 'all' && !pond._fishTypes.includes(selectedFishType))   return false;
    if (colFilters.pond.length       > 0 && !colFilters.pond.includes(pond.number))  return false;
    if (colFilters.department.length > 0 && !colFilters.department.includes(pond._dept)) return false;
    if (colFilters.groups.length     > 0 && !colFilters.groups.some(ft => pond._fishTypes.includes(ft))) return false;
    if (colFilters.line.length       > 0 && !colFilters.line.some(l => pond._lines.includes(l)))  return false;
    if (colFilters.status.length     > 0 && !colFilters.status.includes(pond._status)) return false;
    if (colFilters.notes.length      > 0 && !colFilters.notes.includes(pond.notes))   return false;
    if (forSaleFilter !== 'all' && pond.forSale !== forSaleFilter) return false;
    return true;
  });

  const sortedPonds = useMemo(() => {
    if (!sortKey) return filteredPonds;
    const arr = [...filteredPonds];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'tank_asc':     return smartCompare(a.number, b.number);
        case 'tank_desc':    return smartCompare(b.number, a.number);
        case 'groups_asc':   return smartCompare(a._fishTypesStr, b._fishTypesStr);
        case 'groups_desc':  return smartCompare(b._fishTypesStr, a._fishTypesStr);
        case 'line_asc':     return smartCompare(a._linesStr, b._linesStr);
        case 'line_desc':    return smartCompare(b._linesStr, a._linesStr);
        case 'size_asc':     return smartCompare(a.fishSize, b.fishSize);
        case 'size_desc':    return smartCompare(b.fishSize, a.fishSize);
        case 'updated_asc':  return new Date(a.lastUpdated || 0) - new Date(b.lastUpdated || 0);
        case 'updated_desc': return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
        default: return 0;
      }
    });
    return arr;
  }, [filteredPonds, sortKey]);

  return (
    <div
      className="min-h-screen p-2 sm:p-6 bg-white relative flex items-center justify-center"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        backgroundSize: 'auto', backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full max-w-full">
        <div className="max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 mb-4 w-full box-border">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 shrink-0 px-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs">Back</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Table View</h1>
                <p className="text-xs text-slate-500">Tabular view of all active tanks</p>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <Card className="mb-4 w-full box-border">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-base">Quick Filters</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex flex-col gap-2 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                  <div className="w-full">
                    <Label className="text-xs">System</Label>
                    <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                      <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Systems</SelectItem>
                        {systems.filter(s => s.isActive !== false).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)).map(sys => (
                          <SelectItem key={sys.id} value={sys.id}>{sys.systemName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label className="text-xs">Department</Label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                      <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.filter(d => d.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)).map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                  <div className="w-full">
                    <Label className="text-xs">Fish Type</Label>
                    <Select value={selectedFishType} onValueChange={setSelectedFishType}>
                      <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fish Types</SelectItem>
                        {allFishTypes.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label className="text-xs">For Sale</Label>
                    <Select value={forSaleFilter} onValueChange={setForSaleFilter}>
                      <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                  <div className="w-full">
                    <Label className="text-xs">Search Tank</Label>
                    <Input className="w-full h-9 text-sm" placeholder="Search by tank number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="w-full">
                    <Label className="text-xs">Sort By</Label>
                    <div className="relative" onMouseDown={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`flex items-center gap-2 w-full h-9 px-3 rounded-md border text-sm ${sortKey ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-input bg-white text-slate-700'} hover:bg-slate-50 transition-colors`}
                        onClick={() => setSortOpen(o => !o)}
                      >
                        <ArrowUpDown className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{sortKey ? SORT_OPTIONS.find(o => o.key === sortKey)?.label : 'Default Order'}</span>
                        {sortKey && (
                          <X className="w-3.5 h-3.5 shrink-0 text-teal-600 hover:text-red-500" onClick={e => { e.stopPropagation(); setSortKey(null); setSortOpen(false); }} />
                        )}
                      </button>
                      {sortOpen && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border rounded-md shadow-lg overflow-hidden">
                          {SORT_OPTIONS.map(opt => (
                            <button
                              key={opt.key}
                              type="button"
                              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 text-left ${sortKey === opt.key ? 'bg-teal-50 text-teal-800 font-medium' : 'text-slate-700'}`}
                              onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                            >
                              <opt.icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="w-full box-border">
            <CardHeader className="px-3 pt-3 pb-2">
              <CardTitle className="text-base">Tanks ({sortedPonds.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 font-semibold min-w-[100px]">
                        <div>Tank</div>
                        <MultiSelectCombobox options={colOptions.pond} selected={colFilters.pond} onChange={v => setColFilter('pond', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[130px]">
                        <div>Department</div>
                        <MultiSelectCombobox options={colOptions.department} selected={colFilters.department} onChange={v => setColFilter('department', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[80px]"><div>Batches</div></th>
                      <th className="text-left p-3 font-semibold min-w-[150px]">
                        <div>Groups</div>
                        <MultiSelectCombobox options={colOptions.groups} selected={colFilters.groups} onChange={v => setColFilter('groups', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[130px]">
                        <div>Line</div>
                        <MultiSelectCombobox options={colOptions.line} selected={colFilters.line} onChange={v => setColFilter('line', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[100px]">Size</th>
                      <th className="text-left p-3 font-semibold min-w-[110px]">
                        <div>Status</div>
                        <MultiSelectCombobox options={colOptions.status} selected={colFilters.status} onChange={v => setColFilter('status', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[110px]">Stocking Date</th>
                      <th className="text-left p-3 font-semibold min-w-[200px]">
                        <div>Notes</div>
                        <MultiSelectCombobox options={colOptions.notes} selected={colFilters.notes} onChange={v => setColFilter('notes', v)} />
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[120px]">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPonds.map(pond => (
                      <tr
                        key={pond.id}
                        className={`border-b cursor-pointer hover:bg-slate-50 ${
                          pond._status === 'abnormal' ? 'bg-red-50' :
                          pond._status === 'outdated' ? 'bg-orange-50' : ''
                        }`}
                        onClick={() => setSelectedPond(pond)}
                      >
                        <td className="p-3 font-medium">{pond.number}</td>
                        <td className="p-3">{pond._dept || '—'}</td>
                        <td className="p-3">{pond._batchCount || '—'}</td>
                        <td className="p-3">{pond._fishTypesStr}</td>
                        <td className="p-3">{pond._linesStr}</td>
                        <td className="p-3">
                          {(() => {
                            const isBreeding = pond._dept?.toLowerCase().includes('breed');
                            const isNursery  = pond._dept?.toLowerCase().includes('nursery');
                            const isGrowOut  = !isBreeding && !isNursery;
                            return isGrowOut && pond.fishSize
                              ? <span className="font-medium text-teal-700">{pond.fishSize} cm</span>
                              : <span className="text-slate-400">—</span>;
                          })()}
                        </td>
                        <td className="p-3">
                          <Badge className={
                            pond._status === 'normal'   ? 'bg-green-500'  :
                            pond._status === 'outdated' ? 'bg-orange-500' : 'bg-red-500'
                          }>
                            {pond._status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {pond.stockingDate ? format(new Date(pond.stockingDate), 'MMM d, yyyy') : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-slate-600 text-xs">{pond.notes || '—'}</td>
                        <td className="p-3">
                          {pond.lastUpdated ? format(new Date(pond.lastUpdated), 'MMM d, HH:mm') : 'Never'}
                        </td>
                      </tr>
                    ))}
                    {sortedPonds.length === 0 && (
                      <tr><td colSpan={10} className="p-6 text-center text-slate-500">No tanks found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedPond && (
          <PondDetailModal
            pond={selectedPond}
            groups={groups}
            onClose={() => setSelectedPond(null)}
            onUpdate={() => { refetchPonds(); setSelectedPond(null); }}
            getPondStatus={getPondStatus}
            defaultEditing={true}
          />
        )}
      </div>
    </div>
  );
}
