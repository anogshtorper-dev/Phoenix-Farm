// src/pages/WaterQuality.jsx
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Droplets, GitCompareArrows, Download, Settings, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { RASSystem, Pond, WaterQualityMeasurement, WaterQualityValidRange } from '@/api';
import SystemsComparison from '@/components/waterquality/SystemsComparison';

const getMeasuredAt = (m) => m.date || m.measuredAt;

const parameters = [
  { key: 'temperature', label: 'Temperature (°C)', short: 'Temp' },
  { key: 'ph', label: 'pH', short: 'pH' },
  { key: 'ec', label: 'EC (µS/cm)', short: 'EC' },
  { key: 'do', label: 'DO (mg/L)', short: 'DO' },
  { key: 'alkalinity', label: 'Alkalinity (mg/L)', short: 'Alkalinity' },
  { key: 'ammonia', label: 'TAN (mg/L)', short: 'TAN' },
  { key: 'nitrite', label: 'Nitrite (mg/L)', short: 'NO2' },
  { key: 'nitrate', label: 'Nitrate (mg/L)', short: 'NO3' },
  { key: 'uia', label: 'UIA (mg/L)', short: 'UIA' },
  { key: 'co2', label: 'CO₂ (mg/L)', short: 'CO₂' },
];

const emptyRange = { parameterName: 'temperature', minValue: '', maxValue: '' };

export default function WaterQuality() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('trends');
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('temperature');
  const [selectedPondId, setSelectedPondId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rangeForm, setRangeForm] = useState(emptyRange);
  const [editingRangeId, setEditingRangeId] = useState(null);

  const { data: systems = [] } = useQuery({ queryKey: ['systems'], queryFn: () => RASSystem.list() });
  const { data: ponds = [] } = useQuery({ queryKey: ['ponds'], queryFn: () => Pond.list() });
  const { data: ranges = [] } = useQuery({ queryKey: ['water-quality-ranges'], queryFn: () => WaterQualityValidRange.list() });

  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', selectedSystemId],
    queryFn: () => selectedSystemId ? WaterQualityMeasurement.filter({ systemId: selectedSystemId }) : [],
    enabled: !!selectedSystemId,
  });

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);
  const rangeMap = useMemo(() => Object.fromEntries(ranges.filter((r) => r.isActive !== false).map((r) => [r.parameterName, r])), [ranges]);

  const calcUIA = (tan, temp, ph) => {
    if (tan == null || temp == null || ph == null) return null;
    return tan * (1 / (1 + Math.pow(10, 0.09018 + 2729.92 / (temp + 273.15) - ph)));
  };

  const calcCO2 = (alk, ph) => {
    if (alk == null || ph == null) return null;
    return alk * Math.pow(10, 6.3 - ph);
  };

  const filterByDate = (m) => {
    const ts = new Date(getMeasuredAt(m));
    if (startDate && ts < new Date(startDate)) return false;
    if (endDate && ts > new Date(endDate + 'T23:59:59')) return false;
    return true;
  };

  const getValue = (m, key) => {
    if (key === 'uia') return m.uia != null ? m.uia : calcUIA(m.ammonia, m.temperature, m.ph);
    if (key === 'co2') return m.co2 != null ? m.co2 : calcCO2(m.alkalinity, m.ph);
    return m[key];
  };

  const isOutOfRange = (key, value) => {
    const range = rangeMap[key];
    if (!range || value == null || value === '') return false;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return false;
    return numeric < range.minValue || numeric > range.maxValue;
  };

  const valueCell = (key, value, decimals = null) => {
    const display = value == null ? '-' : (decimals != null ? Number(value).toFixed(decimals) : value);
    const bad = isOutOfRange(key, value);
    return <td className={`p-2 text-sm ${bad ? 'bg-red-100 text-red-700 font-semibold rounded' : ''}`}>{display}</td>;
  };

  const chartData = measurements
    .filter(filterByDate)
    .filter((m) => selectedPondId === 'all' || m.pondId === selectedPondId)
    .filter((m) => getValue(m, selectedParameter) != null)
    .sort((a, b) => new Date(getMeasuredAt(a)) - new Date(getMeasuredAt(b)))
    .map((m) => ({ date: format(new Date(getMeasuredAt(m)), 'MMM d HH:mm'), value: getValue(m, selectedParameter) }))
    .slice(-20);

  const saveRangeMutation = useMutation({
    mutationFn: () => {
      const minValue = Number(rangeForm.minValue);
      const maxValue = Number(rangeForm.maxValue);
      if (!rangeForm.parameterName || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) throw new Error('Please enter a parameter and valid min/max values');
      if (minValue >= maxValue) throw new Error('Minimum value must be lower than maximum value');
      const payload = { parameterName: rangeForm.parameterName, minValue, maxValue, isActive: true };
      return editingRangeId ? WaterQualityValidRange.update(editingRangeId, payload) : WaterQualityValidRange.create(payload);
    },
    onSuccess: () => {
      setRangeForm(emptyRange);
      setEditingRangeId(null);
      queryClient.invalidateQueries({ queryKey: ['water-quality-ranges'] });
    },
    onError: (err) => window.alert(err.message),
  });

  const deleteRangeMutation = useMutation({
    mutationFn: (id) => WaterQualityValidRange.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['water-quality-ranges'] }),
  });

  const exportToExcel = () => {
    const rows = measurements.filter(filterByDate).slice(0, 50);
    const headers = ['Date/Time', 'Tank No.', 'Temp (°C)', 'pH', 'EC (µS/cm)', 'DO (mg/L)', 'Alkalinity (mg/L)', 'TAN (mg/L)', 'NO2 (mg/L)', 'NO3 (mg/L)', 'UIA (mg/L)', 'CO2 (mg/L)', 'Notes'];
    const dataRows = rows.map((m) => [
      format(new Date(getMeasuredAt(m)), 'MMM d yyyy, HH:mm'),
      ponds.find((p) => p.id === m.pondId)?.number || '',
      m.temperature ?? '', m.ph ?? '', m.ec ?? '', m.do ?? '', m.alkalinity ?? '', m.ammonia ?? '', m.nitrite ?? '', m.nitrate ?? '',
      getValue(m, 'uia') != null ? parseFloat(getValue(m, 'uia').toFixed(4)) : '',
      getValue(m, 'co2') != null ? parseFloat(getValue(m, 'co2').toFixed(4)) : '',
      m.notes || '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Measurement History');
    XLSX.writeFile(wb, `Water_Quality_${selectedSystem?.systemName || 'System'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const startEditRange = (range) => {
    setEditingRangeId(range.id);
    setRangeForm({ parameterName: range.parameterName, minValue: range.minValue, maxValue: range.maxValue });
  };

  return (
    <div
      className="min-h-screen bg-white overflow-x-hidden w-full relative"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'auto', backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm" className="shrink-0"><ArrowLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Back</span></Button>
              </Link>
              <Droplets className="w-5 h-5 md:w-7 md:h-7 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">Water Quality</h1>
                <p className="text-xs md:text-sm text-slate-600">Historical data, trends, comparison, and valid ranges</p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-fit mb-4 md:mb-6">
            {[
              { id: 'trends', label: 'Trends', icon: <Droplets className="w-4 h-4" /> },
              { id: 'comparison', label: 'Comparison', icon: <GitCompareArrows className="w-4 h-4" /> },
              { id: 'ranges', label: 'Valid Ranges', icon: <Settings className="w-4 h-4" /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-1 sm:flex-none items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'comparison' && <SystemsComparison />}

          {activeTab === 'ranges' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>{editingRangeId ? 'Edit Valid Range' : 'Add Valid Range'}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <Label>Parameter</Label>
                    <Select value={rangeForm.parameterName} onValueChange={(value) => setRangeForm((p) => ({ ...p, parameterName: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{parameters.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Minimum valid value</Label><Input type="number" step="any" value={rangeForm.minValue} onChange={(e) => setRangeForm((p) => ({ ...p, minValue: e.target.value }))} /></div>
                  <div><Label>Maximum valid value</Label><Input type="number" step="any" value={rangeForm.maxValue} onChange={(e) => setRangeForm((p) => ({ ...p, maxValue: e.target.value }))} /></div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveRangeMutation.mutate()} className="bg-teal-600 hover:bg-teal-700 gap-2"><Plus className="w-4 h-4" />{editingRangeId ? 'Save' : 'Add'}</Button>
                    {editingRangeId && <Button variant="outline" onClick={() => { setEditingRangeId(null); setRangeForm(emptyRange); }}>Cancel</Button>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Defined Valid Ranges</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left p-2">Parameter</th><th className="text-left p-2">Min</th><th className="text-left p-2">Max</th><th className="text-left p-2">Actions</th></tr></thead>
                      <tbody>
                        {ranges.map((range) => (
                          <tr key={range.id} className="border-b hover:bg-slate-50">
                            <td className="p-2 font-medium">{parameters.find((p) => p.key === range.parameterName)?.label || range.parameterName}</td>
                            <td className="p-2">{range.minValue}</td>
                            <td className="p-2">{range.maxValue}</td>
                            <td className="p-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => startEditRange(range)}>Edit</Button><Button size="sm" variant="outline" className="text-red-600 gap-1" onClick={() => deleteRangeMutation.mutate(range.id)}><Trash2 className="w-3 h-3" />Delete</Button></td>
                          </tr>
                        ))}
                        {ranges.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No valid ranges defined yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'trends' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4">
                <Card><CardContent className="p-3 md:pt-6"><Label className="text-xs md:text-sm">Select System</Label><Select value={selectedSystemId} onValueChange={setSelectedSystemId}><SelectTrigger className="h-8 md:h-10 text-sm mt-1"><SelectValue placeholder="Choose a system" /></SelectTrigger><SelectContent>{systems.filter((s) => s.isActive !== false).map((system) => <SelectItem key={system.id} value={system.id}>{system.systemName}</SelectItem>)}</SelectContent></Select></CardContent></Card>
                <Card><CardContent className="p-3 md:pt-6"><Label className="text-xs md:text-sm">Parameter</Label><Select value={selectedParameter} onValueChange={setSelectedParameter}><SelectTrigger className="h-8 md:h-10 text-sm mt-1"><SelectValue /></SelectTrigger><SelectContent>{parameters.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent></Select></CardContent></Card>
                <Card><CardContent className="p-3 md:pt-6"><Label className="text-xs md:text-sm">Date Range</Label><div className="grid grid-cols-2 gap-1 mt-1"><div><label className="text-xs text-slate-500 block mb-1">From</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ fontSize: '11px', width: '100%', height: '28px', padding: '0 4px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} /></div><div><label className="text-xs text-slate-500 block mb-1">To</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ fontSize: '11px', width: '100%', height: '28px', padding: '0 4px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} /></div></div>{(startDate || endDate) && <button className="text-xs text-slate-400 hover:text-slate-600 mt-1" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>}</CardContent></Card>
              </div>

              {selectedSystemId && measurements.length > 0 && (
                <Card className="mb-6">
                  <CardHeader><div className="flex items-center justify-between"><CardTitle>Measurement History</CardTitle><Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2"><Download className="w-4 h-4" />Export Excel</Button></div></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b">{['Date/Time','Tank No.',...parameters.map((p) => p.short)].map((h) => <th key={h} className="text-left p-2 text-sm font-medium">{h}</th>)}</tr></thead>
                        <tbody>
                          {measurements.filter(filterByDate).slice(0, 50).map((m) => {
                            const uia = getValue(m, 'uia');
                            const co2 = getValue(m, 'co2');
                            return (
                              <tr key={m.id} className="border-b hover:bg-slate-50">
                                <td className="p-2 text-sm">{format(new Date(getMeasuredAt(m)), 'MMM d, HH:mm')}</td>
                                <td className="p-2 text-sm">{ponds.find((p) => p.id === m.pondId)?.number || '-'}</td>
                                {valueCell('temperature', m.temperature)}
                                {valueCell('ph', m.ph)}
                                {valueCell('ec', m.ec)}
                                {valueCell('do', m.do)}
                                {valueCell('alkalinity', m.alkalinity)}
                                {valueCell('ammonia', m.ammonia)}
                                {valueCell('nitrite', m.nitrite)}
                                {valueCell('nitrate', m.nitrate)}
                                {valueCell('uia', uia, 4)}
                                {valueCell('co2', co2, 4)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedSystemId && (
                <Card>
                  <CardHeader><CardTitle>{parameters.find((p) => p.key === selectedParameter)?.label} Trend</CardTitle></CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="value" stroke="#0D9488" strokeWidth={2} name={parameters.find((p) => p.key === selectedParameter)?.label} /></LineChart>
                      </ResponsiveContainer>
                    ) : <div className="text-center py-12 text-slate-500">No data available for this parameter</div>}
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
