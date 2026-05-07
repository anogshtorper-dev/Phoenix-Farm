// src/components/reports/SpawningReport.jsx
// Changes: Removed base44 import. SpawningSystem.list replaces entity call.
// Date field normalized to YYYY-MM-DD for filtering.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, Fish, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { SpawningSystem } from '@/api';

export default function SpawningReport() {
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  const { data: records = [] } = useQuery({ queryKey: ['spawning-systems'], queryFn: () => SpawningSystem.list() });

  const normalize = (d) => (d || '').slice(0, 10);

  const filtered = records.filter(r => {
    const d = normalize(r.date);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  });

  const grouped = filtered.reduce((acc, r) => {
    const d = normalize(r.date) || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const exportXLSX = () => {
    const rows = [];
    sortedDates.forEach(date => {
      grouped[date].forEach(r => {
        [1,2,3,4].forEach(i => {
          if (r[`spawn${i}Group`]) {
            rows.push({
              Date: date, 'System Number': r.systemNumber || '',
              Spawn: `Spawn ${i}`, Group: r[`spawn${i}Group`] || '',
              Line: r[`spawn${i}Line`] || '', 'Number of Tanks': r[`spawn${i}NumberOfTanks`] || '',
              'Created By': r.createdByName || r.created_by || '', Notes: r.notes || '',
            });
          }
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Spawning');
    XLSX.writeFile(wb, `spawning-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div><Label>Date From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
            <div><Label>Date To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
              <Button onClick={exportXLSX} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4" /> Export</Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedDates.length === 0 && (
        <div className="text-center py-16 text-slate-400"><Fish className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No spawning events found for the selected range.</p></div>
      )}

      {sortedDates.map(date => {
        const isExpanded  = expandedDates[date] !== false;
        const dayRecords  = grouped[date];
        return (
          <Card key={date} className="print:break-after-page print:shadow-none print:border">
            <CardHeader className="pb-2 border-b cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleDate(date)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <Fish className="w-5 h-5 text-teal-500" />
                  Spawning Report — {date}
                </CardTitle>
                <span className="text-sm text-slate-500">{dayRecords.length} event{dayRecords.length > 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {['System','Spawn','Group','Line','# Tanks','Created By','Notes'].map(h => <th key={h} className="text-left p-2 font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dayRecords.map(r =>
                        [1,2,3,4].map(i => {
                          const group = r[`spawn${i}Group`];
                          if (!group) return null;
                          const spawnCount = [1,2,3,4].filter(j => r[`spawn${j}Group`]).length;
                          return (
                            <tr key={`${r.id}-${i}`} className="border-b hover:bg-slate-50">
                              {i === 1 ? <td className="p-2 font-medium" rowSpan={spawnCount}>System {r.systemNumber}</td> : null}
                              <td className="p-2 text-slate-600">Spawn {i}</td>
                              <td className="p-2">{group}</td>
                              <td className="p-2 italic text-slate-600">{r[`spawn${i}Line`] || '—'}</td>
                              <td className="p-2">{r[`spawn${i}NumberOfTanks`] ?? '—'}</td>
                              {i === 1 ? <td className="p-2 text-xs text-slate-600" rowSpan={spawnCount}>{r.createdByName || r.created_by || '—'}</td> : null}
                              {i === 1 ? <td className="p-2 text-xs text-slate-500 italic" rowSpan={spawnCount}>{r.notes || '—'}</td> : null}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
