// src/pages/Home.jsx
// Changes from original:
//   - Removed base44 import and base44.auth.me() effect
//   - user now comes from useAuth() — already loaded by AuthContext on mount
//   - Pond.list() and PondGroup.list() replace base44.entities.*
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { Pond, PondGroup } from '@/api';
import {
  Droplets,
  AlertTriangle,
  Activity,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  const { data: ponds = [] } = useQuery({
    queryKey: ['ponds'],
    queryFn: () => Pond.list(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => PondGroup.list(),
  });

  const getPondStatus = (pond) => {
    if (!pond.lastUpdated) return 'outdated';

    const daysSinceUpdate =
      (Date.now() - new Date(pond.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) return 'outdated';

    const group = groups.find((g) => g.id === pond.groupId);
    if (!group) return 'normal';

    const metrics = [
      { value: pond.temperature, min: group.tempMin, max: group.tempMax },
      { value: pond.ph,          min: group.phMin,   max: group.phMax   },
      { value: pond.salinity,    min: group.salinityMin, max: group.salinityMax },
    ];

    for (const m of metrics) {
      if (m.value != null) {
        if (m.min != null && m.value < m.min) return 'abnormal';
        if (m.max != null && m.value > m.max) return 'abnormal';
      }
    }

    return 'normal';
  };

  const active = ponds.filter((p) => p.isActive !== false);
  const stats = {
    total:    active.length,
    normal:   active.filter((p) => getPondStatus(p) === 'normal').length,
    abnormal: active.filter((p) => getPondStatus(p) === 'abnormal').length,
    outdated: active.filter((p) => getPondStatus(p) === 'outdated').length,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/4c21e9058_Gemini_Generated_Image_w7vew6w7vew6w7ve.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">Phoenix Farm</h1>
          <p className="text-xl text-slate-600 mb-2">Fish Farm Management System</p>
          <p className="text-sm text-slate-500">
            Real-time pond monitoring and water quality tracking
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/80 backdrop-blur border-teal-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Droplets className="w-8 h-8 text-teal-600" />
                <span className="text-3xl font-bold text-slate-900">{stats.total}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Total Ponds</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-bold text-slate-900">{stats.normal}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Normal Status</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-red-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span className="text-3xl font-bold text-slate-900">{stats.abnormal}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Abnormal Metrics</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-orange-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-600" />
                <span className="text-3xl font-bold text-slate-900">{stats.outdated}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Needs Update</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Monitor Your Ponds</h3>
              <p className="text-teal-50 mb-6">
                View real-time status of all ponds with color-coded alerts and detailed metrics
              </p>
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-white text-teal-600 hover:bg-teal-50">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">View Active Alerts</h3>
              <p className="text-slate-300 mb-6">
                Quick access to all abnormal readings and ponds requiring attention
              </p>
              <Link to={createPageUrl('Alerts')}>
                <Button className="bg-white text-slate-800 hover:bg-slate-100">
                  View Alerts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Logged in as{' '}
              <span className="font-semibold">{user.full_name || user.email}</span>
              {user.role === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                  ADMIN
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
