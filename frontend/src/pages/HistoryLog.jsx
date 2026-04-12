// src/pages/HistoryLog.jsx
// Changes:
//   - Removed base44 import
//   - AuditHistory.list() replaces base44.entities.AuditHistory.list()
//   - Field mapping: Base44 used `created_date` and `created_by`;
//     new schema uses `createdAt` and `performedBy`. Both are handled with fallbacks.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MultiSelectCombobox from '@/components/ui/MultiSelectCombobox';
import { ArrowLeft, Download, History as HistoryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AuditHistory } from '@/api';
import { format } from 'date-fns';

// Field-name helpers to handle both old (Base44) and new (Prisma) field names
const entryDate      = (e) => e.createdAt   || e.created_date;
const entryPerformedBy = (e) => e.performedBy || e.created_by || 'System';

export default function HistoryLog() {
  const [filters, setFilters] = useState({
    entityTypes:  [],
    actions:      [],
    performedBy:  [],
    description:  '',
    dateFrom:     '',
    dateTo:       '',
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history'],
    queryFn:  () => AuditHistory.list({ limit: 500 }),
  });

  const filteredHistory = history.filter((entry) => {
    const date = new Date(entryDate(entry));
    const user = entryPerformedBy(entry);

    if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(entry.entityType)) return false;
    if (filters.actions.length     > 0 && !filters.actions.includes(entry.action))           return false;
    if (filters.performedBy.length > 0 && !filters.performedBy.includes(user))               return false;
    if (filters.description && !entry.description?.toLowerCase().includes(filters.description.toLowerCase())) return false;
    if (filters.dateFrom && date < new Date(filters.dateFrom)) return false;
    if (filters.dateTo   && date > new Date(filters.dateTo))   return false;
    return true;
  });

  const uniqueActions = [...new Set(history.map((h) => h.action))].filter(Boolean).sort();
  const uniqueUsers   = [...new Set(history.map(entryPerformedBy))].sort();

  const clearFilters = () =>
    setFilters({ entityTypes: [], actions: [], performedBy: [], description: '', dateFrom: '', dateTo: '' });

  const exportToCSV = () => {
    const headers = ['Date/Time', 'Entity Type', 'Action', 'Description', 'Performed By'];
    const rows = filteredHistory.map((entry) => [
      format(new Date(entryDate(entry)), 'yyyy-MM-dd HH:mm:ss'),
      entry.entityType,
      entry.action,
      entry.description || '',
      entryPerformedBy(entry),
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `history-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionColor = (action) => {
    if (!action) return 'bg-slate-100 text-slate-600';
    const a = action.toLowerCase();
    if (a === 'create') return 'bg-green-100 text-green-800';
    if (a === 'update') return 'bg-blue-100 text-blue-800';
    if (a === 'delete') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div
      className="min-h-screen p-6 bg-white relative flex items-center justify-center"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat:     'no-repeat',
        backgroundPosition:   'center',
        backgroundSize:       'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />Back
                  </Button>
                </Link>
                <HistoryIcon className="w-7 h-7 text-slate-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">History Log</h1>
                  <p className="text-sm text-slate-600">System audit trail</p>
                </div>
              </div>
              <Button onClick={exportToCSV} className="bg-teal-600 hover:bg-teal-700">
                <Download className="w-4 h-4 mr-2" />Export to CSV
              </Button>
            </div>
          </div>

          {/* Date filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div />
                <div className="flex items-end justify-end">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card>
            <CardHeader>
              <CardTitle>History Entries ({filteredHistory.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <div className="font-semibold text-sm mb-2">Date & Time</div>
                      </th>
                      <th className="text-left p-2">
                        <div className="font-semibold text-sm mb-2">Entity Type</div>
                        <MultiSelectCombobox
                          options={[
                            'AuditHistory','Department','FishBatch','HealthSample',
                            'MetricAcknowledgment','Pond','PondGroup','RASSystem',
                            'Treatment','WaterQualityMeasurement',
                          ]}
                          selected={filters.entityTypes}
                          onChange={(sel) => setFilters({ ...filters, entityTypes: sel })}
                          placeholder="Select types…"
                        />
                      </th>
                      <th className="text-left p-2">
                        <div className="font-semibold text-sm mb-2">Action</div>
                        <MultiSelectCombobox
                          options={uniqueActions}
                          selected={filters.actions}
                          onChange={(sel) => setFilters({ ...filters, actions: sel })}
                          placeholder="Select actions…"
                        />
                      </th>
                      <th className="text-left p-2">
                        <div className="font-semibold text-sm mb-2">Description</div>
                        <Input
                          placeholder="Search…"
                          value={filters.description}
                          onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </th>
                      <th className="text-left p-2">
                        <div className="font-semibold text-sm mb-2">Performed By</div>
                        <MultiSelectCombobox
                          options={uniqueUsers}
                          selected={filters.performedBy}
                          onChange={(sel) => setFilters({ ...filters, performedBy: sel })}
                          placeholder="Select users…"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-sm">
                          {format(new Date(entryDate(entry)), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="p-2 text-sm">{entry.entityType}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${actionColor(entry.action)}`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="p-2 text-sm">{entry.description || '-'}</td>
                        <td className="p-2 text-sm">{entryPerformedBy(entry)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
