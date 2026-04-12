// src/pages/HealthTreatments.jsx
// Changes:
//   - Removed base44 import
//   - HealthSample, Treatment, Pond, FishBatch, RASSystem → named imports from @/api
//   - base44.entities.HealthSample.delete()  → HealthSample.delete()
//   - base44.entities.Treatment.update()     → Treatment.update()
//   - base44.entities.Treatment.delete()     → Treatment.delete()
//   - list() sort arg removed (not supported by new API; backend returns desc by date)
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ChevronDown, ChevronRight, HeartPulse, Pencil, Trash2,
  ArrowLeft, Camera, Eye,
} from 'lucide-react';
import ImageLightbox from '@/components/health/ImageLightbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { HealthSample, Treatment, Pond, FishBatch, RASSystem } from '@/api';
import SampleFormModal    from '@/components/health/SampleFormModal';
import TreatmentFormModal from '@/components/health/TreatmentFormModal';
import TabNavigation      from '@/components/health/TabNavigation';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelectCombobox from '@/components/ui/MultiSelectCombobox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_COLORS = {
  Pending:    'bg-yellow-100 text-yellow-800',
  Treated:    'bg-blue-100 text-blue-800',
  Monitoring: 'bg-purple-100 text-purple-800',
  Resolved:   'bg-green-100 text-green-800',
};

export default function HealthTreatments() {
  const qc = useQueryClient();

  const [view, setView]               = useState('samples');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editSample, setEditSample]   = useState(null);
  const [editTreatment, setEditTreatment] = useState(null);
  const [readOnly, setReadOnly]       = useState(false);
  const [defaultDate, setDefaultDate] = useState('');
  const [expanded, setExpanded]       = useState({});
  const [statusChangeLoading, setStatusChangeLoading] = useState({});
  const [lightbox, setLightbox]       = useState(null);

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', tanks: [], batches: [] });
  const [treatmentFilters, setTreatmentFilters] = useState({ dateFrom: '', dateTo: '', status: 'all' });

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: samples = [] } = useQuery({
    queryKey: ['health-samples'],
    queryFn:  () => HealthSample.list(),
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn:  () => Treatment.list(),
  });

  const { data: allPonds = [] } = useQuery({
    queryKey: ['ponds-active'],
    queryFn:  () => Pond.filter({ isActive: true }),
  });

  const { data: allBatches = [] } = useQuery({
    queryKey: ['fish-batches'],
    queryFn:  () => FishBatch.filter({ isActive: true }),
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['ras-systems'],
    queryFn:  () => RASSystem.filter({ isActive: true }),
  });

  // ── Derived filter options ─────────────────────────────────────────────
  const uniqueTanks = useMemo(
    () => [...new Set(samples.map((s) => s.tankNumber).filter(Boolean))],
    [samples]
  );
  const uniqueBatches = useMemo(() => {
    const set = new Set();
    samples.forEach((s) => { if (s.group && s.line) set.add(`${s.group} - ${s.line}`); });
    return Array.from(set).sort();
  }, [samples]);

  // ── Filtered & grouped samples ────────────────────────────────────────
  const filteredSamples = useMemo(() => {
    // Date comparison against `date` field (ISO string from new schema)
    const normalize = (d) => d ? d.slice(0, 10) : '';
    return samples.filter((s) => {
      const sDate = normalize(s.date || s.treatmentDate);
      if (filters.dateFrom && sDate < filters.dateFrom) return false;
      if (filters.dateTo   && sDate > filters.dateTo)   return false;
      if (filters.tanks.length   > 0 && !filters.tanks.includes(s.tankNumber)) return false;
      if (filters.batches.length > 0) {
        if (!filters.batches.includes(`${s.group} - ${s.line}`)) return false;
      }
      return true;
    });
  }, [samples, filters]);

  const grouped = filteredSamples.reduce((acc, s) => {
    // Group by date string (preferring treatmentDate for display, then date)
    const d = (s.treatmentDate || s.date || 'Unknown').slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const toggleDate  = (d) => setExpanded((e) => ({ ...e, [d]: !e[d] }));

  // ── Action helpers ────────────────────────────────────────────────────
  const openNew = (date = '') => {
    setEditSample(null); setEditTreatment(null); setReadOnly(false);
    setDefaultDate(date); setModalOpen(true);
  };
  const openView = (s) => { setEditSample(s); setReadOnly(true); setModalOpen(true); };
  const openEdit = (s) => { setEditSample(s); setReadOnly(false); setModalOpen(true); };

  const openNewTreatment = (date = '') => {
    setEditTreatment(null); setEditSample(null); setReadOnly(false);
    setDefaultDate(date); setModalOpen(true);
  };
  const openViewTreatment = (t) => { setEditTreatment(t); setReadOnly(true);  setModalOpen(true); };
  const openEditTreatment = (t) => { setEditTreatment(t); setReadOnly(false); setModalOpen(true); };

  const handleDelete = async (id) => {
    await HealthSample.delete(id);
    qc.invalidateQueries({ queryKey: ['health-samples'] });
  };

  const handleDeleteTreatment = async (id) => {
    await Treatment.delete(id);
    qc.invalidateQueries({ queryKey: ['treatments'] });
  };

  const handleTreatmentStatusChange = async (treatmentId, newStatus) => {
    setStatusChangeLoading((p) => ({ ...p, [treatmentId]: true }));
    try {
      await Treatment.update(treatmentId, { status: newStatus });
      qc.invalidateQueries({ queryKey: ['treatments'] });
    } finally {
      setStatusChangeLoading((p) => ({ ...p, [treatmentId]: false }));
    }
  };

  const findings = (s) => [s.finding1, s.finding2, s.finding3, s.finding4, s.finding5].filter(Boolean);

  // ── Filtered treatments ───────────────────────────────────────────────
  const filteredTreatments = treatments.filter((t) => {
    const tDate = (t.date || '').slice(0, 10);
    if (treatmentFilters.dateFrom && tDate < treatmentFilters.dateFrom) return false;
    if (treatmentFilters.dateTo   && tDate > treatmentFilters.dateTo)   return false;
    if (treatmentFilters.status !== 'all' && (t.status || 'Pending') !== treatmentFilters.status) return false;
    return true;
  });

  return (
    <div
      className="min-h-screen bg-white overflow-x-hidden w-full relative"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        backgroundSize: 'auto', backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full p-3 md:p-6">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" />Back
                  </Button>
                </Link>
                <HeartPulse className="w-6 h-6 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Health & Treatments</h1>
                  <p className="text-xs text-slate-500">Fish health sampling records</p>
                </div>
              </div>
              <Button
                onClick={() => view === 'samples' ? openNew() : openNewTreatment()}
                className="bg-teal-600 hover:bg-teal-700 shrink-0"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                New {view === 'samples' ? 'Sample' : 'Treatment'}
              </Button>
            </div>
          </div>

          <TabNavigation
            activeTab={view}
            onTabChange={setView}
            tabs={[{ id: 'samples', label: 'Samples' }, { id: 'treatments', label: 'Treatments' }]}
          />

          {/* Sample filters */}
          {view === 'samples' && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date From</Label>
                    <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date To</Label>
                    <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Tank</Label>
                    <MultiSelectCombobox options={uniqueTanks} selected={filters.tanks} onChange={(sel) => setFilters({ ...filters, tanks: sel })} placeholder="Select tanks…" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Batch</Label>
                    <MultiSelectCombobox options={uniqueBatches} selected={filters.batches} onChange={(sel) => setFilters({ ...filters, batches: sel })} placeholder="Select batches…" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setFilters({ dateFrom: '', dateTo: '', tanks: [], batches: [] })}>
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty states */}
          {view === 'samples' && sortedDates.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{Object.values(filters).some((v) => (Array.isArray(v) ? v.length : v)) ? 'No records match the selected filters.' : 'No health samples recorded yet.'}</p>
              <Button onClick={() => openNew()} variant="outline" className="mt-4">Add First Sample</Button>
            </div>
          )}

          {view === 'treatments' && filteredTreatments.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No treatments recorded yet.</p>
              <Button onClick={() => openNewTreatment()} variant="outline" className="mt-4">Add First Treatment</Button>
            </div>
          )}

          {/* ── Samples view ── */}
          {view === 'samples' && (
            <div className="space-y-4">
              {sortedDates.map((date) => {
                const group  = grouped[date];
                const isOpen = expanded[date] !== false;
                return (
                  <Card key={date} className="overflow-hidden">
                    <CardHeader className="cursor-pointer bg-white hover:bg-slate-50 transition-colors py-4" onClick={() => toggleDate(date)}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                          <CardTitle className="text-base font-semibold text-slate-800 shrink-0">📅 {date}</CardTitle>
                          <span className="text-sm text-slate-500 shrink-0">{group.length} sample{group.length > 1 ? 's' : ''}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openNew(date); }} className="text-xs h-7 self-start sm:self-auto shrink-0">
                          <Plus className="w-3 h-3 mr-1" /> Add Sample
                        </Button>
                      </div>
                    </CardHeader>

                    {isOpen && (
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="space-y-3">
                          {group.map((s) => (
                            <div key={s.id} className="border rounded-lg p-4 bg-slate-50 relative z-0">
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span className="font-semibold text-slate-800">Tank {s.tankNumber}</span>
                                  {s.group        && <span className="text-sm text-slate-600">· {s.group}</span>}
                                  {s.line         && <span className="text-sm text-slate-500 italic">{s.line}</span>}
                                  {s.fishExamined && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{s.fishExamined} fish</span>}
                                  {s.images?.length > 0 && (
                                    <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                      <Camera className="w-3 h-3" />{s.images.length}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => openView(s)}><Eye className="w-3.5 h-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete sample?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
                                {findings(s).length > 0 && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium text-slate-700">Findings: </span>
                                    <span className="text-slate-600">{findings(s).join(' · ')}</span>
                                  </div>
                                )}
                                {s.diagnosis && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium text-slate-700">Diagnosis: </span>
                                    <span className="text-slate-600">{s.diagnosis}</span>
                                  </div>
                                )}
                                {s.treatment && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium text-slate-700">Treatment: </span>
                                    <span className="text-slate-600">{s.treatment}</span>
                                    {s.treatmentDate && <span className="text-slate-400 ml-1">({s.treatmentDate})</span>}
                                    {s.treatedBy     && <span className="text-slate-400 ml-1">by {s.treatedBy}</span>}
                                  </div>
                                )}
                                {s.notes && <div className="md:col-span-2 text-slate-500 italic">{s.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Treatments view ── */}
          {view === 'treatments' && (
            <div className="space-y-4">
              <Card className="mb-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Date From</Label>
                      <Input type="date" value={treatmentFilters.dateFrom} onChange={(e) => setTreatmentFilters({ ...treatmentFilters, dateFrom: e.target.value })} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Date To</Label>
                      <Input type="date" value={treatmentFilters.dateTo} onChange={(e) => setTreatmentFilters({ ...treatmentFilters, dateTo: e.target.value })} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Status</Label>
                      <Select value={treatmentFilters.status} onValueChange={(v) => setTreatmentFilters({ ...treatmentFilters, status: v })}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {['Pending','Treated','Monitoring','Resolved'].map((st) => (
                            <SelectItem key={st} value={st}>{st}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setTreatmentFilters({ dateFrom: '', dateTo: '', status: 'all' })}>Clear Filters</Button>
                  </div>
                </CardContent>
              </Card>

              {filteredTreatments.map((t) => {
                const systemNames = systems
                  .filter((s) => t.systems && t.systems.includes(s.id))
                  .map((s) => s.systemName)
                  .join(', ');

                return (
                  <Card key={t.id} className="overflow-hidden">
                    <div className="border-l-4 border-l-blue-500">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-semibold text-slate-800">📅 {(t.date || '').slice(0, 10)}</span>
                            <span className="text-sm text-slate-600">· {t.treatmentName || t.treatmentType}</span>
                            {(t.dosage || t.concentration) && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {t.dosage || `${t.concentration} ${t.concentrationUnit || ''}`}
                              </span>
                            )}
                            <Select
                              value={t.status || 'Pending'}
                              onValueChange={(v) => handleTreatmentStatusChange(t.id, v)}
                              disabled={statusChangeLoading[t.id]}
                            >
                              <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent">
                                <SelectValue>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {t.status || 'Pending'}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {['Pending','Treated','Monitoring','Resolved'].map((st) => (
                                  <SelectItem key={st} value={st}>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[st]}`}>{st}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => openViewTreatment(t)}><Eye className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTreatment(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete treatment?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTreatment(t.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm mt-3">
                          {systemNames && <div className="md:col-span-2"><span className="font-medium text-slate-700">Systems: </span><span className="text-slate-600">{systemNames}</span></div>}
                          {(t.appliedBy || t.staffName) && <div><span className="font-medium text-slate-700">Staff: </span><span className="text-slate-600">{t.appliedBy || t.staffName}</span></div>}
                          {t.notes && <div className="md:col-span-2 text-slate-500 italic">{t.notes}</div>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {lightbox && (
          <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}

        {view === 'samples' && (
          <SampleFormModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            sample={editSample}
            defaultDate={defaultDate}
            readOnly={readOnly}
            onSaved={() => qc.invalidateQueries({ queryKey: ['health-samples'] })}
          />
        )}

        {view === 'treatments' && (
          <TreatmentFormModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            treatment={editTreatment}
            defaultDate={defaultDate}
            readOnly={readOnly}
            onSaved={() => qc.invalidateQueries({ queryKey: ['treatments'] })}
          />
        )}
      </div>
    </div>
  );
}
