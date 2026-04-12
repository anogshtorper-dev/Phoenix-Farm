// src/pages/Reports.jsx
// No Base44 dependencies in this file — it is a pure shell that delegates
// to report sub-components. Only change: confirmed no base44 imports present.
// Kept exactly as original.
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileText, HeartPulse, Fish, Pill, CheckSquare,
  ArrowLeft, LayoutDashboard, DollarSign, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HealthSamplingReport from '../components/reports/HealthSamplingReport';
import TankDataReport       from '../components/reports/TankDataReport';
import TreatmentsReport     from '../components/reports/TreatmentsReport';
import ChecklistReport      from '../components/reports/ChecklistReport';
import SpawningReport       from '../components/reports/SpawningReport';
import ForSaleReport        from '../components/reports/ForSaleReport';
import BatchCodeReport      from '../components/reports/BatchCodeReport';

export default function Reports() {
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

          <div className="mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
              </Link>
              <FileText className="w-7 h-7 text-teal-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                <p className="text-sm text-slate-600">Generate and export aquaculture reports</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="tanks">
            <TabsList className="mb-4">
              <TabsTrigger value="tanks"       className="gap-2"><LayoutDashboard className="w-4 h-4" /> Tank Data</TabsTrigger>
              <TabsTrigger value="forsale"     className="gap-2"><DollarSign      className="w-4 h-4" /> For Sale</TabsTrigger>
              <TabsTrigger value="batchcodes"  className="gap-2"><Layers          className="w-4 h-4" /> Batch Codes</TabsTrigger>
              <TabsTrigger value="checklists"  className="gap-2"><CheckSquare     className="w-4 h-4" /> Checklists</TabsTrigger>
              <TabsTrigger value="health"      className="gap-2"><HeartPulse      className="w-4 h-4" /> Health Sampling</TabsTrigger>
              <TabsTrigger value="treatments"  className="gap-2"><Pill            className="w-4 h-4" /> Treatments</TabsTrigger>
              <TabsTrigger value="spawning"    className="gap-2"><Fish            className="w-4 h-4" /> Spawning</TabsTrigger>
            </TabsList>

            <TabsContent value="tanks">       <TankDataReport />       </TabsContent>
            <TabsContent value="forsale">     <ForSaleReport />        </TabsContent>
            <TabsContent value="batchcodes">  <BatchCodeReport />      </TabsContent>
            <TabsContent value="checklists">  <ChecklistReport />      </TabsContent>
            <TabsContent value="health">      <HealthSamplingReport /> </TabsContent>
            <TabsContent value="treatments">  <TreatmentsReport />     </TabsContent>
            <TabsContent value="spawning">    <SpawningReport />       </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  );
}
