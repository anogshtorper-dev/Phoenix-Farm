// src/pages/Alerts.jsx
// Changes:
//   - Removed base44 import
//   - user from useAuth() instead of base44.auth.me()
//   - All entity calls replaced: Pond, RASSystem, PondGroup, Department,
//     MetricAcknowledgment, AlertRecord, AuditHistory → named imports from @/api
//   - AlertRecord.update() uses { isResolved: true } (matches Prisma schema field name)
//   - AuditHistory.create() retained as-is through the new AuditHistory api module
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  Pond,
  RASSystem,
  PondGroup,
  Department,
  MetricAcknowledgment,
  AlertRecord,
  AuditHistory,
} from '@/api';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Alerts() {
  const { user } = useAuth();
  const [showAckAllDialog, setShowAckAllDialog] = useState(false);
  const [ackAllLoading, setAckAllLoading]       = useState(false);
  const queryClient = useQueryClient();

  const { data: ponds = [] } = useQuery({
    queryKey: ['ponds'],
    queryFn:  () => Pond.list(),
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: async () => {
      const list = await RASSystem.list();
      return list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => PondGroup.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => Department.list(),
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ['acknowledgments'],
    queryFn:  () => MetricAcknowledgment.list(),
  });

  const { data: alertRecords = [], refetch: refetchAlertRecords } = useQuery({
    queryKey: ['alertRecords'],
    queryFn:  () => AlertRecord.list(),
  });

  // ── Acknowledge mutation ──────────────────────────────────────────────────
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ pondId, metricType }) => {
      const ack = await MetricAcknowledgment.create({
        pondId,
        metricType,
        acknowledgedAt: new Date().toISOString(),
      });
      await AuditHistory.create({
        entityType:  'MetricAcknowledgment',
        entityId:    ack.id,
        action:      'Acknowledge',
        description: `Acknowledged ${metricType} alert`,
      });
      return ack;
    },
    onSuccess: () => queryClient.invalidateQueries(['acknowledgments']),
  });

  // ── Compute active alerts from current pond averages ──────────────────────
  const getAlerts = () => {
    const alerts = [];

    systems.forEach((system) => {
      if (!system.id) return;

      const systemPonds = ponds.filter((p) => p.systemId === system.id);
      const systemGroup = groups.find((g) => systemPonds.some((p) => p.groupId === g.id));
      if (!systemGroup || systemPonds.length === 0) return;

      const avg = (key) => {
        const vals = systemPonds.map((p) => p[key]).filter((v) => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };

      const check = (metricType, value, min, max, unit) => {
        if (value == null) return;
        const isAck = acknowledgments.some(
          (a) => a.pondId === system.id && a.metricType === metricType
        );
        if (isAck) return;
        if (min != null && value < min) {
          alerts.push({ systemId: system.id, systemName: system.systemName, metricType, value, min, max, unit, status: 'low',  severity: 'high' });
        } else if (max != null && value > max) {
          alerts.push({ systemId: system.id, systemName: system.systemName, metricType, value, min, max, unit, status: 'high', severity: 'high' });
        }
      };

      check('temperature', avg('temperature'), systemGroup.tempMin,       systemGroup.tempMax,       '°C');
      check('ph',          avg('ph'),          systemGroup.phMin,         systemGroup.phMax,         '');
      check('ec',          avg('ec'),          systemGroup.ecMin,         systemGroup.ecMax,         'µS/cm');
      check('do',          avg('do'),          systemGroup.doMin,         systemGroup.doMax,         'mg/L');
      check('alkalinity',  avg('alkalinity'),  systemGroup.alkalinityMin, systemGroup.alkalinityMax, 'mg/L');
      check('ammonia',     avg('ammonia'),     systemGroup.ammoniaMin,    systemGroup.ammoniaMax,    'mg/L');
      check('nitrite',     avg('nitrite'),     systemGroup.nitriteMin,    systemGroup.nitriteMax,    'mg/L');
      check('nitrate',     avg('nitrate'),     systemGroup.nitrateMin,    systemGroup.nitrateMax,    'mg/L');
    });

    return alerts;
  };

  const alerts = getAlerts();

  // ── Sync alert records (create new / resolve stale) ───────────────────────
  // Note: field is `createdAt` in new schema (was `firstSeenAt` conceptually).
  useEffect(() => {
    if (!alerts.length || alertRecords === undefined) return;

    alerts.forEach(async (alert) => {
      const existing = alertRecords.find(
        (r) => r.systemId === alert.systemId && r.metricType === alert.metricType && !r.isResolved
      );
      if (!existing) {
        await AlertRecord.create({
          systemId:    alert.systemId,
          metricType:  alert.metricType,
          isResolved:  false,
        });
        refetchAlertRecords();
      }
    });

    alertRecords.forEach(async (record) => {
      if (record.isResolved) return;
      const stillActive = alerts.some(
        (a) => a.systemId === record.systemId && a.metricType === record.metricType
      );
      if (!stillActive) {
        await AlertRecord.update(record.id, { isResolved: true });
        refetchAlertRecords();
      }
    });
  }, [alerts.length, alertRecords.length]);

  const getAlertFirstSeen = (systemId, metricType) => {
    const record = alertRecords.find(
      (r) => r.systemId === systemId && r.metricType === metricType && !r.isResolved
    );
    return record?.createdAt || null;
  };

  const handleAcknowledge = (alert) => {
    if (user?.role !== 'admin') {
      window.alert('Only administrators can acknowledge alerts');
      return;
    }
    acknowledgeMutation.mutate({ pondId: alert.systemId, metricType: alert.metricType });
  };

  const handleAcknowledgeAll = async () => {
    setAckAllLoading(true);
    for (const alert of alerts.filter((a) => a.metricType !== 'outdated')) {
      await acknowledgeMutation.mutateAsync({ pondId: alert.systemId, metricType: alert.metricType });
    }
    setAckAllLoading(false);
    setShowAckAllDialog(false);
  };

  return (
    <div
      className="min-h-screen p-6 bg-white relative flex items-center justify-center"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat:   'no-repeat',
        backgroundPosition: 'center',
        backgroundSize:     'auto',
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
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <AlertTriangle className="w-7 h-7 text-yellow-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Active Alerts</h1>
                  <p className="text-sm text-slate-600">{alerts.length} alerts require attention</p>
                </div>
              </div>
              {alerts.filter((a) => a.metricType !== 'outdated').length > 0 && user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowAckAllDialog(true)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Acknowledge All
                </Button>
              )}
            </div>
          </div>

          {/* Alert cards */}
          <div className="grid gap-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                  <p className="text-slate-600">All tanks are operating within normal parameters</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert, index) => {
                const systemPonds = ponds.filter((p) => p.systemId === alert.systemId);
                return (
                  <Card key={index} className="border-l-4 border-l-red-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <div>
                            <CardTitle className="text-lg">System {alert.systemName}</CardTitle>
                            <p className="text-sm text-slate-600">{systemPonds.length} ponds affected</p>
                          </div>
                        </div>
                        <Badge className={alert.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {alert.metricType === 'outdated' ? (
                            <p className="text-slate-700">
                              <span className="font-semibold">Data Outdated:</span> Not updated for{' '}
                              {alert.value} days
                            </p>
                          ) : (
                            <>
                              <p className="text-slate-700">
                                <span className="font-semibold capitalize">
                                  {alert.metricType === 'ammonia' ? 'TAN' : alert.metricType}:
                                </span>{' '}
                                {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}{' '}
                                {alert.unit}
                              </p>
                              <p className="text-sm text-slate-500 mt-1">
                                Expected range: {alert.min} – {alert.max} {alert.unit}
                                {alert.status === 'low'  && ' (Too Low)'}
                                {alert.status === 'high' && ' (Too High)'}
                              </p>
                            </>
                          )}
                          {(() => {
                            const firstSeen = getAlertFirstSeen(alert.systemId, alert.metricType);
                            return firstSeen ? (
                              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                First detected: {format(new Date(firstSeen), 'dd/MM/yyyy HH:mm')}
                              </p>
                            ) : null;
                          })()}
                        </div>
                        {alert.metricType !== 'outdated' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert)}
                            disabled={user?.role !== 'admin'}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Recently acknowledged */}
          {(() => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(0, 0, 0, 0);

            // New schema uses createdAt (was created_date in Base44)
            const recent = acknowledgments.filter((ack) => {
              const d = new Date(ack.createdAt || ack.created_date);
              return d >= twoDaysAgo;
            });

            return recent.length > 0 ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recently Acknowledged Alerts (Last 2 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recent.map((ack) => {
                      const system = systems.find((s) => s.id === ack.pondId);
                      return (
                        <div
                          key={ack.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                        >
                          <div>
                            <p className="font-medium">System {system?.systemName}</p>
                            <p className="text-sm text-slate-600 capitalize">
                              {ack.metricType} acknowledged
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {format(new Date(ack.createdAt || ack.created_date), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}
        </div>
      </div>

      {/* Acknowledge-all dialog */}
      <AlertDialog open={showAckAllDialog} onOpenChange={setShowAckAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge All Alerts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will acknowledge all{' '}
              {alerts.filter((a) => a.metricType !== 'outdated').length} active alerts. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ackAllLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledgeAll} disabled={ackAllLoading}>
              {ackAllLoading ? 'Processing…' : 'Acknowledge All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
