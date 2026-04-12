// src/pages/Admin.jsx
// Changes:
//   - Removed base44 import and base44.auth.me() effect
//   - User comes from useAuth(); admin guard enforced via useEffect on user
//   - No entity calls in this file — all delegation to admin sub-components
//   - isLoadingAuth used to show loading state instead of null-user check
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import GroupsManagement      from '../components/admin/GroupsManagement';
import PondsManagement       from '../components/admin/PondsManagement';
import DepartmentsManagement from '../components/admin/DepartmentsManagement';
import SpeciesManagement     from '../components/admin/SpeciesManagement';
import SystemsManagement     from '../components/admin/SystemsManagement';
import LinesManagement       from '../components/admin/LinesManagement';
import TreatmentsManagement  from '../components/admin/TreatmentsManagement';

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  // Guard: redirect non-admins immediately once auth is resolved
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user || user.role !== 'admin') {
      navigate(createPageUrl('Dashboard'), { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  if (isLoadingAuth || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading…
      </div>
    );
  }

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
          <Tabs defaultValue="departments">
            <TabsList>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="ponds">Tanks</TabsTrigger>
              <TabsTrigger value="species">Groups</TabsTrigger>
              <TabsTrigger value="lines">Lines</TabsTrigger>
              <TabsTrigger value="systems">Systems</TabsTrigger>
              <TabsTrigger value="treatments">Treatments</TabsTrigger>
            </TabsList>

            <TabsContent value="departments">
              <DepartmentsManagement />
            </TabsContent>
            <TabsContent value="ponds">
              <PondsManagement />
            </TabsContent>
            <TabsContent value="species">
              <SpeciesManagement />
            </TabsContent>
            <TabsContent value="lines">
              <LinesManagement />
            </TabsContent>
            <TabsContent value="systems">
              <SystemsManagement />
            </TabsContent>
            <TabsContent value="treatments">
              <TreatmentsManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
