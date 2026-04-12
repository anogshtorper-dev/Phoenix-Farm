// src/pages/SystemsChecklist.jsx
// Changes:
//   - Removed base44 import
//   - base44.auth.me() replaced with useAuth() to get user
//   - AuditHistory.filter() and AuditHistory.create/update() replace entity calls
//   - Field mapping:
//       Original used `newValue` (string) for checklist payload storage.
//       New schema uses `after` (JSON) — we write to `after` and read from both
//       `after` and legacy `newValue` so migrated data still loads correctly.
//   - `performedBy` replaces `performedAt` + `user.email` pattern
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { AuditHistory } from '@/api';

const CHECKLIST_ITEMS = [
  { key: 'sandFilter',           label: 'Sand Filter',             type: 'ok_notok'           },
  { key: 'ozoneMixingTank',      label: 'Ozone Mixing Tank',       type: 'ok_notok'           },
  { key: 'bufferTank',           label: 'Buffer Tank',             type: 'full_empty'         },
  { key: 'tricklingFilterTowers',label: 'Trickling Filter Towers', type: 'ok_notok'           },
  { key: 'hydrocyclone',         label: 'Hydrocyclone',            type: 'ok_notok'           },
  { key: 'ozon',                 label: 'Ozon',                    type: 'ok_notok_with_power'},
  { key: 'hydrocycloneScreen',   label: 'Hydrocyclone Screen',     type: 'ok_notok'           },
  { key: 'sandFilterScreen',     label: 'Sand Filter Screen',      type: 'ok_notok'           },
];

const defaultItemState = () => ({ status: '', note: '' });
const emptyItems = () => Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, defaultItemState()]));

// Helper: extract checklist payload from an AuditHistory record.
// Handles both new schema (`after` JSON object) and legacy Base44 (`newValue` JSON string).
function extractPayload(record) {
  try {
    if (record.after && typeof record.after === 'object') return record.after;
    if (record.newValue) return JSON.parse(record.newValue);
  } catch { /* ignore parse errors */ }
  return null;
}

export default function SystemsChecklist() {
  const { toast }     = useToast();
  const { user }      = useAuth();

  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [staffName,  setStaffName]  = useState('');
  const [items,      setItems]      = useState(emptyItems);
  const [saving,     setSaving]     = useState(false);
  const [existingId, setExistingId] = useState(null);

  // Load or reset checklist when date changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const records = await AuditHistory.filter({ entityType: 'SystemsChecklist' });
        if (cancelled) return;

        const match = records.find((r) => {
          const payload = extractPayload(r);
          return payload?.date === date;
        });

        if (match) {
          const data = extractPayload(match);
          setStaffName(data.staffName || '');
          setItems(data.items || emptyItems());
          setExistingId(match.id);
        } else {
          setItems(emptyItems());
          setStaffName('');
          setExistingId(null);
        }
      } catch (err) {
        console.error('Failed to load checklist:', err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [date]);

  const updateItem = (key, field, value) => {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async () => {
    if (!date || !staffName.trim()) {
      toast({ title: 'Please fill in Date and Staff Name', variant: 'destructive', duration: 5000 });
      return;
    }
    setSaving(true);
    try {
      // `after` is the new JSON field; we also populate `description` and `performedBy`
      // which are first-class columns on the AuditHistory model.
      const payload = {
        entityType:  'SystemsChecklist',
        entityId:    `checklist-${date}`,
        action:      existingId ? 'update' : 'create',
        performedBy: user?.full_name || user?.email || staffName,
        description: `Systems Checklist submitted by ${staffName} on ${date}`,
        after:       { date, staffName, items },
      };

      if (existingId) {
        await AuditHistory.update(existingId, payload);
      } else {
        const created = await AuditHistory.create(payload);
        setExistingId(created.id);
      }
      toast({ title: 'Checklist saved successfully!' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusOptions = (type) =>
    type === 'full_empty' ? ['Full', 'Empty'] : ['Ok', 'Not Ok'];

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
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
              </Link>
              <CheckSquare className="w-6 h-6 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Systems Checklist</h1>
                <p className="text-sm text-slate-500">Daily systems inspection form</p>
              </div>
            </div>
          </div>

          {/* Date + Staff */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Staff Name *</Label>
                  <Input
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Enter staff name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-800">{item.label}</span>

                    {item.type === 'numeric' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Power %</span>
                        <Input
                          type="number" min={1} max={100}
                          value={items[item.key].status}
                          onChange={(e) => updateItem(item.key, 'status', e.target.value)}
                          placeholder="1–100"
                          className="w-24 text-center"
                        />
                      </div>
                    ) : item.type === 'ok_notok_with_power' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Power %</span>
                          <Input
                            type="number" min={1} max={100}
                            value={items[item.key].power || ''}
                            onChange={(e) => updateItem(item.key, 'power', e.target.value)}
                            placeholder="1–100"
                            className="w-20 text-center"
                          />
                        </div>
                        <div className="flex gap-2">
                          {['Ok', 'Not Ok'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => updateItem(item.key, 'status', opt)}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                items[item.key].status === opt
                                  ? opt === 'Ok'
                                    ? 'bg-green-100 border-green-400 text-green-700'
                                    : 'bg-red-100 border-red-400 text-red-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {getStatusOptions(item.type).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateItem(item.key, 'status', opt)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              items[item.key].status === opt
                                ? opt === 'Ok' || opt === 'Full'
                                  ? 'bg-green-100 border-green-400 text-green-700'
                                  : opt === 'Empty'
                                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                                  : 'bg-red-100 border-red-400 text-red-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Textarea
                    value={items[item.key].note}
                    onChange={(e) => updateItem(item.key, 'note', e.target.value)}
                    placeholder="Note (optional)"
                    className="h-16 text-sm resize-none"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : 'Save Checklist'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
