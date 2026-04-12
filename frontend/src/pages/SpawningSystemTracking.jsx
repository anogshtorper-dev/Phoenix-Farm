// src/pages/SpawningSystemTracking.jsx
// Changes:
//   - Removed base44 import
//   - RASSystem.filter(), FishBatch.filter(), SpawningSystem.list/create/update/delete replace entity calls
//   - base44.auth.me() for createdByName replaced with useAuth() user
//   - SpawningSystem.list() sort arg dropped; backend returns desc by date natively
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Fish } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { RASSystem, FishBatch, SpawningSystem } from '@/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const EMPTY_FORM = () => ({
  date: new Date().toISOString().split('T')[0],
  systemNumber: '',
  spawn1Group: '', spawn1Line: '', spawn1NumberOfTanks: '',
  spawn2Group: '', spawn2Line: '', spawn2NumberOfTanks: '',
  spawn3Group: '', spawn3Line: '', spawn3NumberOfTanks: '',
  spawn4Group: '', spawn4Line: '', spawn4NumberOfTanks: '',
  notes: '',
});

export default function SpawningSystemTracking() {
  const { toast }   = useToast();
  const { user }    = useAuth();
  const qc          = useQueryClient();
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editingRecord,  setEditingRecord]  = useState(null);
  const [expanded,       setExpanded]       = useState({});
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [form,           setForm]           = useState(EMPTY_FORM);

  const { data: systems = [] } = useQuery({ queryKey: ['ras-systems'],     queryFn: () => RASSystem.filter({ isActive: true }) });
  const { data: batches = [] } = useQuery({ queryKey: ['fish-batches'],    queryFn: () => FishBatch.filter({ isActive: true }) });
  const { data: records = [] } = useQuery({ queryKey: ['spawning-systems'],queryFn: () => SpawningSystem.list() });

  const uniqueGroups     = [...new Set(batches.map(b => b.group).filter(Boolean))].sort();
  const getLinesForGroup = (group) =>
    [...new Set(batches.filter(b => b.group === group).map(b => b.line).filter(Boolean))].sort();

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openNew  = () => { setForm(EMPTY_FORM()); setEditingRecord(null); setModalOpen(true); };
  const openEdit = (record) => {
    setEditingRecord(record);
    setForm({
      date: (record.date || '').slice(0, 10),
      systemNumber: record.systemNumber,
      spawn1Group: record.spawn1Group || '', spawn1Line: record.spawn1Line || '', spawn1NumberOfTanks: record.spawn1NumberOfTanks ?? '',
      spawn2Group: record.spawn2Group || '', spawn2Line: record.spawn2Line || '', spawn2NumberOfTanks: record.spawn2NumberOfTanks ?? '',
      spawn3Group: record.spawn3Group || '', spawn3Line: record.spawn3Line || '', spawn3NumberOfTanks: record.spawn3NumberOfTanks ?? '',
      spawn4Group: record.spawn4Group || '', spawn4Line: record.spawn4Line || '', spawn4NumberOfTanks: record.spawn4NumberOfTanks ?? '',
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.systemNumber) {
      toast({ title: 'Please fill in Date and System Number', variant: 'destructive' }); return;
    }
    if (![1, 2, 3, 4].some(i => form[`spawn${i}Group`])) {
      toast({ title: 'Please fill in at least one Spawn', variant: 'destructive' }); return;
    }
    const cleanForm = { ...form };
    [1, 2, 3, 4].forEach(i => {
      const v = cleanForm[`spawn${i}NumberOfTanks`];
      if (v === '' || v == null) delete cleanForm[`spawn${i}NumberOfTanks`];
      else cleanForm[`spawn${i}NumberOfTanks`] = Number(v);
    });
    try {
      if (editingRecord) {
        await SpawningSystem.update(editingRecord.id, cleanForm);
        toast({ title: 'Spawning system updated successfully!' });
      } else {
        await SpawningSystem.create({
          ...cleanForm,
          createdByName: user?.full_name || user?.email || '',
        });
        toast({ title: 'Spawning system saved successfully!' });
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['spawning-systems'] });
    } catch {
      toast({ title: 'Error saving record', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await SpawningSystem.delete(id);
      toast({ title: 'Record deleted successfully!' });
      qc.invalidateQueries({ queryKey: ['spawning-systems'] });
    } catch {
      toast({ title: 'Error deleting record', variant: 'destructive' });
    }
  };

  const toggleDate = (date) => setExpanded(prev => ({ ...prev, [date]: !prev[date] }));

  const filteredRecords = records.filter(r => {
    const d = (r.date || '').slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  });

  const grouped = filteredRecords.reduce((acc, r) => {
    const d = (r.date || 'Unknown').slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const SpawnSection = ({ index }) => {
    const selectedGroup = form[`spawn${index}Group`] || '';
    const linesForGroup = selectedGroup ? getLinesForGroup(selectedGroup) : [];
    const selectedLine  = form[`spawn${index}Line`] || '';
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Spawn {index}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Group (Fish Type)</Label>
            <Select value={selectedGroup} onValueChange={(v) => { set(`spawn${index}Group`, v); set(`spawn${index}Line`, ''); }}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select group..." /></SelectTrigger>
              <SelectContent>{uniqueGroups.map(g => <SelectItem key={g} value={g || 'unknown'}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Line</Label>
            <Select value={selectedLine} onValueChange={(v) => set(`spawn${index}Line`, v)} disabled={!selectedGroup}>
              <SelectTrigger className="text-sm"><SelectValue placeholder={selectedGroup ? 'Select line...' : 'Select group first'} /></SelectTrigger>
              <SelectContent>{linesForGroup.map(l => <SelectItem key={l} value={l || 'unknown'}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Number of Tanks</Label>
            <Input type="number" value={form[`spawn${index}NumberOfTanks`]} onChange={e => set(`spawn${index}NumberOfTanks`, e.target.value)} onWheel={e => e.preventDefault()} placeholder="0" className="text-sm" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-3 md:p-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
              </Link>
              <Fish className="w-6 h-6 text-orange-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Spawning System</h1>
                <p className="text-xs text-slate-500">Track spawning events and batch information</p>
              </div>
            </div>
            <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700" size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-sm font-medium mb-2 block">Date From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 text-sm" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Date To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 text-sm" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {records.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Fish className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No spawning events recorded yet.</p>
            <Button onClick={openNew} variant="outline" className="mt-4"><Plus className="w-4 h-4 mr-1" /> Add First Event</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(date => {
              const group  = grouped[date];
              const isOpen = expanded[date] !== false;
              return (
                <Card key={date} className="overflow-hidden">
                  <CardHeader className="cursor-pointer bg-white hover:bg-slate-50 transition-colors py-4" onClick={() => toggleDate(date)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <CardTitle className="text-base font-semibold text-slate-800">📅 {date}</CardTitle>
                        <span className="text-sm text-slate-500">{group.length} event{group.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="pt-4 pb-4 px-4">
                      <div className="space-y-3">
                        {group.map(record => (
                          <div key={record.id} className="border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-start justify-between mb-3 gap-2">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-semibold text-slate-800">System {record.systemNumber}</span>
                                {record.createdByName && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">👤 {record.createdByName}</span>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(record)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this spawning event?</AlertDialogTitle>
                                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(record.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              {[1, 2, 3, 4].map(index => {
                                const g = record[`spawn${index}Group`];
                                const l = record[`spawn${index}Line`];
                                const t = record[`spawn${index}NumberOfTanks`];
                                return (
                                  <div key={index} className="border-l-2 border-l-teal-200 pl-3">
                                    <p className="font-medium text-slate-700 mb-1">Spawn {index}</p>
                                    {g ? (
                                      <>
                                        <p className="text-xs text-slate-600"><span className="font-medium">Group:</span> {g}</p>
                                        <p className="text-xs text-slate-600"><span className="font-medium">Line:</span> {l}</p>
                                        <p className="text-xs text-slate-600"><span className="font-medium">Tanks:</span> {t ?? '—'}</p>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">—</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {record.notes && (
                              <div className="mt-3 pt-3 border-t text-sm text-slate-600 italic">
                                <span className="font-medium">Notes: </span>{record.notes}
                              </div>
                            )}
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingRecord ? 'Edit Spawning Event' : 'New Spawning Event'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date *</Label>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} max={new Date().toISOString().split('T')[0]} className="text-sm" />
                </div>
                <div>
                  <Label className="text-sm font-medium">System Number *</Label>
                  <Select value={form.systemNumber} onValueChange={v => set('systemNumber', v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select system number..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SpawnSection index={1} />
                <SpawnSection index={2} />
                <SpawnSection index={3} />
                <SpawnSection index={4} />
              </div>
              {editingRecord?.createdByName && (
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <Input value={editingRecord.createdByName} disabled className="text-sm bg-slate-50" />
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." className="h-16 resize-none text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                  {editingRecord ? 'Update Event' : 'Save Event'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
