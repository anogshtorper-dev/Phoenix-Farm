// src/components/waterquality/SystemsComparison.jsx
// Changes:
//   - Removed base44 import
//   - RASSystem.list, Pond.list, WaterQualityMeasurement.list replace entity calls
//   - `measuredAt` → getMeasuredAt() helper for both old and new schema field names
import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChevronDown, X, RotateCcw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RASSystem, Pond, WaterQualityMeasurement } from '@/api';

const getMeasuredAt = (m) => m.date || m.measuredAt;

const PARAMETERS = [
  { key: 'temperature', label: 'Temperature (°C)' },
  { key: 'ph',          label: 'pH' },
  { key: 'ec',          label: 'EC (µS/cm)' },
  { key: 'do',          label: 'DO (mg/L)' },
  { key: 'alkalinity',  label: 'Alkalinity (mg/L)' },
  { key: 'ammonia',     label: 'TAN (mg/L)' },
  { key: 'nitrite',     label: 'Nitrite (mg/L)' },
  { key: 'nitrate',     label: 'Nitrate (mg/L)' },
  { key: 'uia',         label: 'UIA (mg/L)' },
  { key: 'co2',         label: 'CO₂ (mg/L)' },
];

function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (value) => onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);
  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white cursor-pointer min-h-[40px] gap-2 hover:border-teal-400 transition-colors" onClick={() => setOpen(v => !v)}>
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.length === 0 ? <span className="text-slate-400 text-sm">{placeholder}</span>
            : selectedLabels.map((lbl, i) => (
                <span key={i} className="bg-teal-100 text-teal-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  {lbl}<X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggle(options.find(o => o.label === lbl)?.value); }} />
                </span>
              ))
          }
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div key={opt.value} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm ${selected.includes(opt.value) ? 'bg-teal-50' : ''}`} onClick={() => toggle(opt.value)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt.value) ? 'bg-teal-600 border-teal-600' : 'border-slate-300'}`}>
                {selected.includes(opt.value) && <span className="text-white text-xs">✓</span>}
              </div>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SystemsComparison() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [selectedParams,  setSelectedParams]  = useState(['temperature']);

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: async () => { const list = await RASSystem.list(); return list.sort((a,b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)); },
  });
  const { data: ponds = [] } = useQuery({ queryKey: ['ponds'], queryFn: () => Pond.list() });
  const { data: allMeasurements = [] } = useQuery({
    queryKey: ['all-measurements-comparison'],
    queryFn: () => WaterQualityMeasurement.list(),
  });

  const getLatestForSystem = (systemId) => {
    const sorted = allMeasurements.filter(m => m.systemId === systemId).sort((a,b) => new Date(getMeasuredAt(b)) - new Date(getMeasuredAt(a)));
    return sorted[0] || null;
  };

  const getLatestFromPonds = (systemId) => {
    const sysPonds = ponds.filter(p => p.systemId === systemId && p.lastUpdated);
    if (!sysPonds.length) return null;
    return sysPonds.sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))[0];
  };

  const activeSystemsList = systems.filter(s => s.isActive !== false);
  const systemOptions = activeSystemsList.map(s => ({ value: s.id, label: s.systemName }));
  const paramOptions  = PARAMETERS.map(p => ({ value: p.key, label: p.label }));

  const tableRows = selectedSystems.map(sysId => {
    const system     = systems.find(s => s.id === sysId);
    const latest     = getLatestForSystem(sysId);
    const fallback   = !latest ? getLatestFromPonds(sysId) : null;
    const dataSource = latest || fallback;
    return {
      system,
      dataSource,
      updatedAt: dataSource
        ? latest
          ? format(new Date(getMeasuredAt(latest)), 'dd/MM/yyyy HH:mm')
          : fallback?.lastUpdated ? format(new Date(fallback.lastUpdated), 'dd/MM/yyyy HH:mm') : '—'
        : '—',
    };
  });

  const handleReset = () => { setSelectedSystems([]); setSelectedParams(['temperature']); };

  const exportXLSX = () => {
    const rows = tableRows.map(({ system, dataSource, updatedAt }) => {
      const row = { System: system?.systemName || '', 'Last Updated': updatedAt };
      selectedParams.forEach(pk => { const p = PARAMETERS.find(x => x.key === pk); row[p?.label || pk] = (dataSource && dataSource[pk] != null) ? dataSource[pk] : ''; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Systems Comparison');
    XLSX.writeFile(wb, `systems-comparison-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Select Systems & Parameters</CardTitle>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-slate-500"><RotateCcw className="w-3.5 h-3.5" />Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Systems</label>
            <MultiSelectDropdown options={systemOptions} selected={selectedSystems} onChange={setSelectedSystems} placeholder="Select systems..." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Parameters</label>
            <MultiSelectDropdown options={paramOptions} selected={selectedParams} onChange={setSelectedParams} placeholder="Select parameters..." />
          </div>
        </CardContent>
      </Card>

      {selectedSystems.length > 0 && selectedParams.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Comparison — Last Update per System</CardTitle>
              <Button size="sm" onClick={exportXLSX} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">System</th>
                    <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Last Updated</th>
                    {selectedParams.map(pk => {
                      const param = PARAMETERS.find(p => p.key === pk);
                      return <th key={pk} className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">{param?.label}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ system, dataSource, updatedAt }) => (
                    <tr key={system?.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{system?.systemName}</td>
                      <td className="p-3 text-slate-500 text-xs">{updatedAt}</td>
                      {selectedParams.map(pk => (
                        <td key={pk} className="p-3">
                          {dataSource && dataSource[pk] != null ? <span className="font-medium text-teal-700">{dataSource[pk]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSystems.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Select at least one system above to start comparing.</p>
        </div>
      )}
    </div>
  );
}
