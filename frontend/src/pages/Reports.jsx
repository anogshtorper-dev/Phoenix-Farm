// src/pages/Reports.jsx
// No Base44 dependencies in this file — it is a pure shell that delegates
// to report sub-components. Only change: confirmed no base44 imports present.
// Kept exactly as original.
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, HeartPulse, Fish, Pill, SquareCheck as CheckSquare, ArrowLeft, LayoutDashboard, DollarSign, Layers } from 'lucide-react';
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
      className="min-h-screen p-3 md:p-6 bg-white relative"
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

          <div className="mb-4 md:mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 md:p-4 flex items-center gap-2 md:gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <FileText className="w-5 h-5 md:w-7 md:h-7 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">Reports</h1>
                <p className="text-xs md:text-sm text-slate-600">Generate and export reports</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="tanks">
            <div className="overflow-x-auto mb-3 md:mb-4">
              <TabsList className="flex w-max min-w-full md:w-full md:flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="tanks"       className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><LayoutDashboard className="w-3 h-3 md:w-4 md:h-4" /> Tank Data</TabsTrigger>
                <TabsTrigger value="forsale"     className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><DollarSign      className="w-3 h-3 md:w-4 md:h-4" /> For Sale</TabsTrigger>
                <TabsTrigger value="batchcodes"  className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><Layers          className="w-3 h-3 md:w-4 md:h-4" /> Batch Codes</TabsTrigger>
                <TabsTrigger value="checklists"  className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><CheckSquare     className="w-3 h-3 md:w-4 md:h-4" /> Checklists</TabsTrigger>
                <TabsTrigger value="health"      className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><HeartPulse      className="w-3 h-3 md:w-4 md:h-4" /> Health</TabsTrigger>
                <TabsTrigger value="treatments"  className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><Pill            className="w-3 h-3 md:w-4 md:h-4" /> Treatments</TabsTrigger>
                <TabsTrigger value="spawning"    className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"><Fish            className="w-3 h-3 md:w-4 md:h-4" /> Spawning</TabsTrigger>
              </TabsList>
            </div>

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
