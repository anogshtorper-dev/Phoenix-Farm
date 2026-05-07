// src/components/reports/BatchCodeReport.jsx
// Changes: Removed base44 import. Pond.list, RASSystem.list, AuditHistory.list, FishBatch.list.
// AuditHistory field mapping: `newValue/oldValue` (Base44) → `after/before` (new schema),
// with fallbacks so migrated data still works.
import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Download, Printer, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Pond, RASSystem, AuditHistory, FishBatch } from '@/api';

function BatchCodeMultiSelect({ allCodes, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = allCodes.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const toggle   = (code) => onChange(selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code]);
  const removeOne = (code, e) => { e.stopPropagation(); onChange(selected.filter(c => c !== code)); };
  return (
    <div className="relative" ref={ref}>
      <div className="min-h-[36px] w-full border rounded-md px-2 py-1 flex flex-wrap gap-1 items-center cursor-text bg-white focus-within:ring-1 focus-within:ring-teal-400" onClick={() => setOpen(true)}>
        {selected.map(code => (
          <span key={code} className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full font-medium">
            {code}
            <button type="button" onClick={(e) => removeOne(code, e)} className="hover:text-teal-600"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={selected.length === 0 ? 'Search or select batch codes...' : ''} className="flex-1 min-w-[120px] outline-none text-sm bg-transparent" />
        {selected.length > 0 && <button type="button" onClick={e => { e.stopPropagation(); onChange([]); setSearch(''); }} className="ml-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 && <div className="px-3 py-4 text-sm text-slate-400 text-center">No batch codes found</div>}
          {filtered.map(code => (
            <label key={code} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(code)} onChange={() => toggle(code)} className="accent-teal-600" />
              <span className="font-mono">{code}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BatchCodeReport() {
  const [selectedCodes, setSelectedCodes] = useState([]);

  const { data: ponds        = [] } = useQuery({ queryKey: ['ponds'],        queryFn: () => Pond.list() });
  const { data: systems      = [] } = useQuery({ queryKey: ['ras-systems'],  queryFn: () => RASSystem.list() });
  const { data: auditHistory = [] } = useQuery({ queryKey: ['audit-history'],queryFn: () => AuditHistory.list() });
  const { data: fishBatches  = [] } = useQuery({ queryKey: ['fish-batches'], queryFn: () => FishBatch.list() });

  const getSystemName = (id) => systems.find(s => s.id === id)?.systemName || '—';

  const allBatchCodes = [...new Set([
    ...fishBatches.map(b => b.batchCode),
    ...ponds.map(p => p.batchCode),
  ].filter(Boolean))].sort();

  const buildHistory = () => {
    if (selectedCodes.length === 0) return [];
    const rows = [];
    selectedCodes.forEach(code => {
      const batches = fishBatches.filter(b => b.batchCode === code);
      batches.forEach(batch => {
        const pond   = ponds.find(p => p.id === batch.currentTankId);
        const system = pond ? getSystemName(pond.systemId) : '—';
        rows.push({
          batchCode: code, type: 'current',
          date: batch.stockingDate || batch.created_date || batch.createdAt || '',
          tankNumber: batch.currentTankNumber || '—', system,
          group: batch.group || '—', line: batch.line || '—', action: 'Stocked',
          description: `Batch ${batch.batchId || ''} stocked${batch.fishCount ? ` — ${batch.fishCount} fish` : ''}${batch.notes ? ` | ${batch.notes}` : ''}`,
          performedBy: '',
        });
        if (batch.transferDate && batch.targetTankNumber) {
          rows.push({
            batchCode: code, type: 'transfer', date: batch.transferDate,
            tankNumber: batch.targetTankNumber, system,
            group: batch.group || '—', line: batch.line || '—', action: 'Transfer',
            description: `Transferred from ${batch.currentTankNumber || '?'} → ${batch.targetTankNumber}`,
            performedBy: '',
          });
        }
        if (batch.currentTankId) {
          auditHistory
            .filter(a => a.entityType === 'Pond' && a.entityId === batch.currentTankId)
            .forEach(a => {
              // Handle both old (newValue/oldValue string) and new (after/before JSON) schema
              const afterStr  = typeof a.after === 'string' ? a.after : JSON.stringify(a.after || '');
              const beforeStr = typeof a.before === 'string' ? a.before : JSON.stringify(a.before || '');
              const newVal    = a.newValue || afterStr || '';
              const oldVal    = a.oldValue || beforeStr || '';
              if (!(a.description || '').includes(code) && !newVal.includes(code) && !oldVal.includes(code)) return;
              rows.push({
                batchCode: code, type: 'history',
                date: a.performedAt || a.created_date || a.createdAt || '',
                tankNumber: batch.currentTankNumber || '—', system,
                group: batch.group || '—', line: batch.line || '—',
                action: a.action || '—', description: a.description || '—',
                performedBy: a.performedBy || '',
              });
            });
        }
      });
    });
    rows.sort((a, b) => a.batchCode !== b.batchCode ? a.batchCode.localeCompare(b.batchCode) : new Date(a.date) - new Date(b.date));
    return rows;
  };

  const historyRows = buildHistory();
  const formatDate  = (d) => { if (!d) return '—'; try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; } };

  const exportXLSX = () => {
    const rows = historyRows.map(r => ({ 'Batch Code': r.batchCode, Date: formatDate(r.date), 'Tank #': r.tankNumber, System: r.system, Group: r.group, Line: r.line, Action: r.action, Description: r.description, 'Performed By': r.performedBy }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Batch History');
    XLSX.writeFile(wb, `batch-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[280px]">
              <Label className="mb-1 block">Batch Code(s)</Label>
              <BatchCodeMultiSelect allCodes={allBatchCodes} selected={selectedCodes} onChange={setSelectedCodes} />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setSelectedCodes([])}>Clear</Button>
              <Button onClick={exportXLSX} disabled={historyRows.length === 0} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4" /> Export</Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Batch History{selectedCodes.length > 0 && ` — ${historyRows.length} record${historyRows.length !== 1 ? 's' : ''}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCodes.length === 0 ? (
            <div className="py-12 text-center text-slate-400"><div className="text-4xl mb-3">🐟🐟🐟</div><p>Select one or more batch codes to view their history</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {['Batch Code','Date','Tank #','System','Group','Line','Action','Description','By'].map(h => <th key={h} className="text-left p-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, i) => (
                    <tr key={i} className={`border-b hover:bg-slate-50 ${row.type === 'current' ? 'bg-teal-50/40' : ''}`}>
                      <td className="p-2"><span className="font-mono text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">{row.batchCode}</span></td>
                      <td className="p-2 text-slate-500 whitespace-nowrap text-xs">{formatDate(row.date)}</td>
                      <td className="p-2 font-medium">{row.tankNumber}</td>
                      <td className="p-2 text-slate-600">{row.system}</td>
                      <td className="p-2">{row.group && row.group !== '—' ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">{row.group}</span> : '—'}</td>
                      <td className="p-2 italic text-slate-600">{row.line}</td>
                      <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${row.action === 'current' ? 'bg-green-100 text-green-800' : row.action === 'Create' || row.action === 'create' ? 'bg-blue-100 text-blue-800' : row.action === 'Update' || row.action === 'update' ? 'bg-amber-100 text-amber-800' : row.action === 'Delete' || row.action === 'delete' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{row.action}</span></td>
                      <td className="p-2 text-slate-500 max-w-xs">{row.description}</td>
                      <td className="p-2 text-slate-400 text-xs">{row.performedBy}</td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && selectedCodes.length > 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">No history found for the selected batch code(s).</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
