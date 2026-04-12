// src/components/reports/ChecklistReport.jsx
// Changes: Removed base44 import. AuditHistory.filter replaces entity call.
// Data extraction handles both old `newValue` (JSON string) and new `after` (JSON object).
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { AuditHistory } from '@/api';

const CHECKLIST_ITEMS = [
  { key: 'sandFilter',            label: 'Sand Filter',             type: 'ok_notok' },
  { key: 'ozoneMixingTank',       label: 'Ozone Mixing Tank',       type: 'ok_notok' },
  { key: 'bufferTank',            label: 'Buffer Tank',             type: 'full_empty' },
  { key: 'tricklingFilterTowers', label: 'Trickling Filter Towers', type: 'ok_notok' },
  { key: 'hydrocyclone',          label: 'Hydrocyclone',            type: 'ok_notok' },
  { key: 'ozon',                  label: 'Ozon',                    type: 'ok_notok_with_power' },
  { key: 'hydrocycloneScreen',    label: 'Hydrocyclone Screen',     type: 'ok_notok' },
  { key: 'sandFilterScreen',      label: 'Sand Filter Screen',      type: 'ok_notok' },
];

const STATUS_COLORS = {
  'Ok':     'bg-green-100 text-green-800',
  'Not Ok': 'bg-red-100 text-red-800',
  'Full':   'bg-blue-100 text-blue-800',
  'Empty':  'bg-orange-100 text-orange-800',
};

function extractPayload(r) {
  try {
    if (r.after && typeof r.after === 'object') return r.after;
    if (r.newValue) return JSON.parse(r.newValue);
  } catch { /* ignore */ }
  return null;
}

export default function ChecklistReport() {
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo,   setDateTo]           = useState('');
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  const { data: records = [] } = useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const auditRecords = await AuditHistory.filter({ entityType: 'SystemsChecklist' });
      return auditRecords.map(r => {
        const data = extractPayload(r);
        if (!data) return null;
        return { id: r.id, ...data, created_at: r.createdAt || r.created_date };
      }).filter(Boolean);
    },
  });

  const filteredRecords = useMemo(() =>
    records.filter(r => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo   && r.date > dateTo)   return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records, dateFrom, dateTo]);

  const getItemDisplay = (item) => {
    const itemDef = CHECKLIST_ITEMS.find(i => i.key === item.key);
    if (!itemDef) return null;
    const { status, note, power } = item.value;
    let statusDisplay = status;
    if (itemDef.type === 'ok_notok_with_power' && power) statusDisplay = `${status} (${power}%)`;
    return { label: itemDef.label, status: statusDisplay, note };
  };

  const exportXLSX = () => {
    const rows = [];
    filteredRecords.forEach(record => {
      Object.entries(record.items || {}).forEach(([key, value]) => {
        const display = getItemDisplay({ key, value });
        if (!display) return;
        rows.push({ Date: record.date, 'Staff Member': record.staffName || '—', Item: display.label, Status: display.status || '—', Notes: display.note || '—' });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklists');
    XLSX.writeFile(wb, `checklist-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader><CardTitle className="text-sm font-semibold">Filter Checklists</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-slate-500 mb-2 block">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm" /></div>
            <div><Label className="text-xs text-slate-500 mb-2 block">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm" /></div>
            <div className="flex items-end gap-2">
              <Button onClick={() => { setDateFrom(''); setDateTo(''); }} variant="outline" size="sm">Clear</Button>
              <Button onClick={exportXLSX} size="sm" className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4" />Export</Button>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="gap-2 print:hidden"><Printer className="w-4 h-4" />Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-slate-500"><Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" /><p>No checklists found for the selected date range</p></CardContent></Card>
        ) : filteredRecords.map(record => {
          const isExpanded = expandedDates[record.date] !== false;
          return (
            <Card key={record.id} className="bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleDate(record.date)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <div>
                      <CardTitle className="text-base font-semibold">📋 {record.date}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">Staff: {record.staffName || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {record.created_at && format(new Date(record.created_at), 'MMM d, HH:mm')}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(record.items || {}).map(([key, value]) => {
                      const display = getItemDisplay({ key, value });
                      if (!display) return null;
                      return (
                        <div key={key} className="border rounded p-3 bg-white hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-slate-800 text-sm">{display.label}</span>
                            {display.status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[display.status?.split('(')[0].trim()] || 'bg-slate-100 text-slate-600'}`}>{display.status}</span>
                            )}
                          </div>
                          {display.note && <p className="text-xs text-slate-600 italic">{display.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
