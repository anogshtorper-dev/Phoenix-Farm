// src/pages/SystemsChecklist.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SquareCheck as CheckSquare, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { AuditHistory, ChecklistTask } from '@/api';

const defaultItemState = () => ({ status: '', note: '' });
const emptyItems = (tasks = []) => Object.fromEntries(tasks.map((i) => [i.key, defaultItemState()]));

function extractPayload(record) {
  try {
    if (record.after && typeof record.after === 'object') return record.after;
    if (record.newValue) return JSON.parse(record.newValue);
  } catch { /* ignore parse errors */ }
  return null;
}

export default function SystemsChecklist() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffName, setStaffName] = useState('');
  const [items, setItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const { data: checklistTasks = [] } = useQuery({
    queryKey: ['checklist-tasks-active'],
    queryFn: () => ChecklistTask.filter({ isActive: true }),
  });

  useEffect(() => {
    setItems((prev) => ({ ...emptyItems(checklistTasks), ...prev }));
  }, [checklistTasks]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const records = await AuditHistory.filter({ entityType: 'SystemsChecklist' });
        if (cancelled) return;
        const match = records.find((r) => extractPayload(r)?.date === date);
        if (match) {
          const data = extractPayload(match);
          setStaffName(data.staffName || '');
          setItems({ ...emptyItems(checklistTasks), ...(data.items || {}) });
          setExistingId(match.id);
        } else {
          setItems(emptyItems(checklistTasks));
          setStaffName('');
          setExistingId(null);
        }
      } catch (err) {
        console.error('Failed to load checklist:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [date, checklistTasks]);

  const updateItem = (key, field, value) => {
    setItems((prev) => ({ ...prev, [key]: { ...(prev[key] || defaultItemState()), [field]: value } }));
  };

  const handleSave = async () => {
    if (!date || !staffName.trim()) {
      toast({ title: 'Please fill in Date and Staff Name', variant: 'destructive', duration: 5000 });
      return;
    }
    setSaving(true);
    try {
      const activeItems = Object.fromEntries(checklistTasks.map((task) => [task.key, items[task.key] || defaultItemState()]));
      const payload = {
        entityType: 'SystemsChecklist',
        entityId: `checklist-${date}`,
        action: existingId ? 'update' : 'create',
        performedBy: user?.full_name || user?.email || staffName,
        description: `Systems Checklist submitted by ${staffName} on ${date}`,
        after: { date, staffName, items: activeItems },
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

  const getStatusOptions = (type) => type === 'full_empty' ? ['Full', 'Empty'] : ['Ok', 'Not Ok'];

  return (
    <div
      className="min-h-screen p-3 md:p-6 bg-white relative"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <CheckSquare className="w-5 h-5 md:w-7 md:h-7 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">Systems Checklist</h1>
                <p className="text-xs md:text-sm text-slate-600">Daily system checks</p>
              </div>
            </div>
          </div>

          <Card className="mb-4">
            <CardHeader><CardTitle>Checklist Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Staff Name</Label>
                <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Enter staff name" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {checklistTasks.map((item) => {
              const itemState = items[item.key] || defaultItemState();
              return (
                <Card key={item.key}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <Label className="text-base font-semibold">{item.label}</Label>
                        {item.type === 'ok_notok_with_power' && <p className="text-xs text-slate-500 mt-1">If relevant, describe power / operation issue in notes.</p>}
                      </div>
                      <div className="flex gap-2">
                        {getStatusOptions(item.type).map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={itemState.status === option ? 'default' : 'outline'}
                            className={itemState.status === option ? 'bg-teal-600 hover:bg-teal-700' : ''}
                            onClick={() => updateItem(item.key, 'status', option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      className="mt-3"
                      value={itemState.note || ''}
                      onChange={(e) => updateItem(item.key, 'note', e.target.value)}
                      placeholder="Optional notes"
                    />
                  </CardContent>
                </Card>
              );
            })}

            {checklistTasks.length === 0 && (
              <Card><CardContent className="p-6 text-center text-slate-500">No active checklist tasks. Add or enable tasks in Admin.</CardContent></Card>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving || checklistTasks.length === 0} className="bg-teal-600 hover:bg-teal-700 gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Checklist'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
