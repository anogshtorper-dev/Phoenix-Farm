// src/components/reports/TreatmentsReport.jsx
// Changes: Removed base44 import. Treatment.list, RASSystem.list replace entity calls.
// Date field normalized to YYYY-MM-DD for filtering.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, Pill, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Treatment, RASSystem } from '@/api';

const STATUS_COLORS = {
  Pending:    'bg-yellow-100 text-yellow-800',
  Treated:    'bg-blue-100 text-blue-800',
  Monitoring: 'bg-purple-100 text-purple-800',
  Resolved:   'bg-green-100 text-green-800',
};

export default function TreatmentsReport() {
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  const { data: treatments = [] } = useQuery({ queryKey: ['treatments'],  queryFn: () => Treatment.list() });
  const { data: systems    = [] } = useQuery({ queryKey: ['ras-systems'], queryFn: () => RASSystem.list() });

  const getSystemNames = (systemIds) => {
    if (!systemIds || !Array.isArray(systemIds)) return '';
    return systemIds.map(id => systems.find(s => s.id === id)?.systemName || id).filter(Boolean).join(', ');
  };

  const normalize = (d) => (d || '').slice(0, 10);

  const filtered = treatments.filter(t => {
    const d = normalize(t.date);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    if (statusFilter !== 'all' && (t.status || 'Pending') !== statusFilter) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, t) => {
    const d = normalize(t.date) || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const exportXLSX = () => {
    const rows = [];
    sortedDates.forEach(date => {
      grouped[date].forEach(t => {
        rows.push({
          Date: date, 'Treatment Type': t.treatmentType || t.treatmentName || '',
          Systems: getSystemNames(t.systems), Concentration: t.concentration || '',
          Unit: t.concentrationUnit || '', Status: t.status || 'Pending',
          'Staff Name': t.staffName || t.appliedBy || '', Notes: t.notes || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Treatments');
    XLSX.writeFile(wb, `treatments-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div><Label>Date From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
            <div><Label>Date To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {['Pending','Treated','Monitoring','Resolved'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); }}>Clear</Button>
              <Button onClick={exportXLSX} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4" /> Export</Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedDates.length === 0 && (
        <div className="text-center py-16 text-slate-400"><Pill className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No treatments found for the selected range.</p></div>
      )}

      {sortedDates.map(date => {
        const isExpanded = expandedDates[date] !== false;
        return (
          <Card key={date} className="print:break-after-page print:shadow-none print:border">
            <CardHeader className="pb-2 border-b cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleDate(date)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <Pill className="w-5 h-5 text-blue-500" />
                  Treatments Report — {date}
                </CardTitle>
                <span className="text-sm text-slate-500">{grouped[date].length} treatment{grouped[date].length > 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {['Treatment Type','Systems','Concentration','Unit','Status','Staff Name','Notes'].map(h => <th key={h} className="text-left p-2 font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[date].map(t => (
                        <tr key={t.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium">{t.treatmentType || t.treatmentName || '—'}</td>
                          <td className="p-2">{getSystemNames(t.systems) || '—'}</td>
                          <td className="p-2">{t.concentration ?? '—'}</td>
                          <td className="p-2">{t.concentrationUnit || '—'}</td>
                          <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600'}`}>{t.status || 'Pending'}</span></td>
                          <td className="p-2">{t.staffName || t.appliedBy || '—'}</td>
                          <td className="p-2 text-slate-600">{t.notes || '—'}</td>
                        </tr>
                      ))}
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
