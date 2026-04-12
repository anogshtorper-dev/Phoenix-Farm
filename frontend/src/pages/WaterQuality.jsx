// src/pages/WaterQuality.jsx
// Changes:
//   - Removed base44 import
//   - RASSystem.list(), Pond.list(), WaterQualityMeasurement.filter() replace entity calls
//   - Measurement date field: original used `m.measuredAt`; new schema stores `date`.
//     Both are handled with a helper so existing stored data works either way.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Droplets, GitCompareArrows, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { RASSystem, Pond, WaterQualityMeasurement } from '@/api';
import SystemsComparison from '@/components/waterquality/SystemsComparison';

// Measurement records may use `date` (new schema) or `measuredAt` (legacy).
const getMeasuredAt = (m) => m.date || m.measuredAt;

export default function WaterQuality() {
  const [activeTab, setActiveTab]             = useState('trends');
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('temperature');
  const [selectedPondId, setSelectedPondId]   = useState('all');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn:  () => RASSystem.list(),
  });

  const { data: ponds = [] } = useQuery({
    queryKey: ['ponds'],
    queryFn:  () => Pond.list(),
  });

  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', selectedSystemId],
    queryFn:  () => {
      if (!selectedSystemId) return [];
      return WaterQualityMeasurement.filter({ systemId: selectedSystemId });
    },
    enabled: !!selectedSystemId,
  });

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);
  const systemPonds    = ponds.filter((p) => p.systemId === selectedSystemId);

  const filterByDate = (m) => {
    const ts = new Date(getMeasuredAt(m));
    if (startDate && ts < new Date(startDate)) return false;
    if (endDate   && ts > new Date(endDate + 'T23:59:59')) return false;
    return true;
  };

  const getChartData = () => {
    const base = measurements.filter(filterByDate);
    const filtered =
      selectedPondId === 'all'
        ? base.filter((m) => m[selectedParameter] != null)
        : base.filter((m) => m.pondId === selectedPondId && m[selectedParameter] != null);

    return filtered
      .sort((a, b) => new Date(getMeasuredAt(a)) - new Date(getMeasuredAt(b)))
      .map((m) => ({
        date:  format(new Date(getMeasuredAt(m)), 'MMM d HH:mm'),
        value: m[selectedParameter],
      }))
      .slice(-20);
  };

  const chartData = getChartData();

  const parameters = [
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

  const calcUIA = (tan, temp, ph) => {
    if (tan == null || temp == null || ph == null) return null;
    return tan * (1 / (1 + Math.pow(10, 0.09018 + 2729.92 / (temp + 273.15) - ph)));
  };

  const calcCO2 = (alk, ph) => {
    if (alk == null || ph == null) return null;
    return alk * Math.pow(10, 6.3 - ph);
  };

  const exportToExcel = () => {
    const rows = measurements.filter(filterByDate).slice(0, 50);
    const headers = [
      'Date/Time', 'Tank No.', 'Temp (°C)', 'pH', 'EC (µS/cm)', 'DO (mg/L)',
      'Alkalinity (mg/L)', 'TAN (mg/L)', 'NO2 (mg/L)', 'NO3 (mg/L)', 'UIA (mg/L)', 'CO2 (mg/L)', 'Notes',
    ];
    const dataRows = rows.map((m) => {
      const uia = m.uia != null ? m.uia : calcUIA(m.ammonia, m.temperature, m.ph);
      const co2 = m.co2 != null ? m.co2 : calcCO2(m.alkalinity, m.ph);
      return [
        format(new Date(getMeasuredAt(m)), 'MMM d yyyy, HH:mm'),
        ponds.find((p) => p.id === m.pondId)?.number || '',
        m.temperature ?? '', m.ph ?? '', m.ec ?? '', m.do ?? '',
        m.alkalinity ?? '', m.ammonia ?? '', m.nitrite ?? '', m.nitrate ?? '',
        uia != null ? parseFloat(uia.toFixed(4)) : '',
        co2 != null ? parseFloat(co2.toFixed(4)) : '',
        m.notes || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Measurement History');
    XLSX.writeFile(
      wb,
      `Water_Quality_${selectedSystem?.systemName || 'System'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );
  };

  return (
    <div
      className="min-h-screen bg-white overflow-x-hidden w-full relative"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat:     'no-repeat',
        backgroundPosition:   'center',
        backgroundSize:       'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full p-3 md:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
              </Link>
              <Droplets className="w-7 h-7 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Water Quality</h1>
                <p className="text-sm text-slate-600">Historical data and trends</p>
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
            {[
              { id: 'trends',     label: 'Trends',              icon: <Droplets className="w-4 h-4" /> },
              { id: 'comparison', label: 'Systems Comparison',  icon: <GitCompareArrows className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'comparison' && <SystemsComparison />}

          {activeTab === 'trends' && (
            <>
              {/* Filters row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4">
                <Card>
                  <CardContent className="p-3 md:pt-6">
                    <Label className="text-xs md:text-sm">Select System</Label>
                    <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                      <SelectTrigger className="h-8 md:h-10 text-sm mt-1">
                        <SelectValue placeholder="Choose a system" />
                      </SelectTrigger>
                      <SelectContent>
                        {systems.filter((s) => s.isActive !== false).map((system) => (
                          <SelectItem key={system.id} value={system.id}>
                            {system.systemName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 md:pt-6">
                    <Label className="text-xs md:text-sm">Parameter</Label>
                    <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                      <SelectTrigger className="h-8 md:h-10 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parameters.map((p) => (
                          <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 md:pt-6">
                    <Label className="text-xs md:text-sm">Date Range</Label>
                    <div className="grid grid-cols-2 gap-1 mt-1" style={{ overflow: 'hidden' }}>
                      <div style={{ minWidth: 0 }}>
                        <label className="text-xs text-slate-500 block mb-1">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          style={{ fontSize: '11px', width: '100%', height: '28px', padding: '0 4px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label className="text-xs text-slate-500 block mb-1">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          style={{ fontSize: '11px', width: '100%', height: '28px', padding: '0 4px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    {(startDate || endDate) && (
                      <button
                        className="text-xs text-slate-400 hover:text-slate-600 mt-1"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                      >
                        Clear
                      </button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Measurement history table */}
              {selectedSystemId && measurements.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Measurement History</CardTitle>
                      <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                        <Download className="w-4 h-4" />Export Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            {['Date/Time','Tank No.','Temp','pH','EC','DO','Alkalinity','TAN','NO2','NO3','UIA','CO₂'].map((h) => (
                              <th key={h} className="text-left p-2 text-sm font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {measurements.filter(filterByDate).slice(0, 50).map((m) => {
                            const uia = m.uia != null ? m.uia : calcUIA(m.ammonia, m.temperature, m.ph);
                            const co2 = m.co2 != null ? m.co2 : calcCO2(m.alkalinity, m.ph);
                            return (
                              <tr key={m.id} className="border-b hover:bg-slate-50">
                                <td className="p-2 text-sm">{format(new Date(getMeasuredAt(m)), 'MMM d, HH:mm')}</td>
                                <td className="p-2 text-sm">{ponds.find((p) => p.id === m.pondId)?.number || '-'}</td>
                                <td className="p-2 text-sm">{m.temperature || '-'}</td>
                                <td className="p-2 text-sm">{m.ph          || '-'}</td>
                                <td className="p-2 text-sm">{m.ec          || '-'}</td>
                                <td className="p-2 text-sm">{m.do          || '-'}</td>
                                <td className="p-2 text-sm">{m.alkalinity  || '-'}</td>
                                <td className="p-2 text-sm">{m.ammonia     || '-'}</td>
                                <td className="p-2 text-sm">{m.nitrite     || '-'}</td>
                                <td className="p-2 text-sm">{m.nitrate     || '-'}</td>
                                <td className="p-2 text-sm">{uia != null ? uia.toFixed(4) : '-'}</td>
                                <td className="p-2 text-sm">{co2 != null ? co2.toFixed(4) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trend chart */}
              {selectedSystemId && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {parameters.find((p) => p.key === selectedParameter)?.label} Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#0D9488"
                            strokeWidth={2}
                            name={parameters.find((p) => p.key === selectedParameter)?.label}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        No data available for this parameter
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
