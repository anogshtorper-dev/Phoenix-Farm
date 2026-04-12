// src/components/reports/HealthSamplingReport.jsx
// Changes: Removed base44 import. HealthSample.list, Pond.list, RASSystem.list, Department.list.
// `created_by` field referenced in export is a Base44-ism — falls back gracefully to empty string.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, HeartPulse, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { HealthSample, Pond, RASSystem, Department } from '@/api';

export default function HealthSamplingReport() {
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  const { data: samples     = [] } = useQuery({ queryKey: ['health-samples'], queryFn: () => HealthSample.list() });
  const { data: ponds       = [] } = useQuery({ queryKey: ['ponds-all'],      queryFn: () => Pond.list() });
  const { data: systems     = [] } = useQuery({ queryKey: ['ras-systems'],    queryFn: () => RASSystem.list() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'],    queryFn: () => Department.list() });

  const getPondInfo = (tankNumber) => {
    const pond = ponds.find(p => p.number === tankNumber);
    if (!pond) return { system: null, department: null };
    return {
      system:     systems.find(s => s.id === pond.systemId)?.systemName || null,
      department: departments.find(d => d.id === pond.departmentId)?.name || null,
    };
  };

  const normalize = (d) => (d || '').slice(0, 10);

  const filtered = samples.filter(s => {
    const d = normalize(s.date);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  });

  const grouped = filtered.reduce((acc, s) => {
    const d = normalize(s.date) || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const findings = (s) => [s.finding1, s.finding2, s.finding3, s.finding4, s.finding5].filter(Boolean).join(', ');

  const exportXLSX = () => {
    const rows = [];
    sortedDates.forEach(date => {
      grouped[date].forEach(s => {
        const { system, department } = getPondInfo(s.tankNumber);
        rows.push({
          Date: date, Tank: s.tankNumber || '', System: system || '', Department: department || '',
          Group: s.group || '', Line: s.line || '', 'Fish Examined': s.fishExamined || '',
          Findings: findings(s), Diagnosis: s.diagnosis || '', Treatment: s.treatment || '',
          'Staff Member': s.created_by || s.treatedBy || '', Notes: s.notes || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Health Samples');
    XLSX.writeFile(wb, `health-sampling-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
        <div className="text-center py-16 text-slate-400"><HeartPulse className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No health samples found for the selected range.</p></div>
      )}

      {sortedDates.map(date => {
        const isExpanded = expandedDates[date] !== false;
        return (
          <Card key={date} className="print:break-after-page print:shadow-none print:border">
            <CardHeader className="pb-2 border-b cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleDate(date)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <HeartPulse className="w-5 h-5 text-rose-500" />
                  Health Sampling Report — {date}
                </CardTitle>
                <span className="text-sm text-slate-500">{grouped[date].length} sample{grouped[date].length > 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {['Tank','System','Department','Group','Line','# Examined','Findings','Diagnosis','Treatment','Staff Member'].map(h => <th key={h} className="text-left p-2 font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[date].map(s => {
                        const { system, department } = getPondInfo(s.tankNumber);
                        return (
                          <tr key={s.id} className="border-b hover:bg-slate-50">
                            <td className="p-2 font-medium">{s.tankNumber || '—'}</td>
                            <td className="p-2">{system || '—'}</td>
                            <td className="p-2">{department || '—'}</td>
                            <td className="p-2">{s.group || '—'}</td>
                            <td className="p-2 italic text-slate-600">{s.line || '—'}</td>
                            <td className="p-2">{s.fishExamined ?? '—'}</td>
                            <td className="p-2 max-w-xs">{findings(s) || '—'}</td>
                            <td className="p-2">{s.diagnosis || '—'}</td>
                            <td className="p-2">{s.treatment || '—'}</td>
                            <td className="p-2 text-sm">{s.created_by || s.treatedBy || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {grouped[date].some(s => s.notes) && (
                  <div className="mt-3 space-y-1">
                    {grouped[date].filter(s => s.notes).map(s => (
                      <p key={s.id} className="text-xs text-slate-500 italic">Tank {s.tankNumber}: {s.notes}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
