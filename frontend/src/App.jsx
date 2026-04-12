// src/App.jsx
// Replaces the Base44 App.jsx with a standalone React Router setup.
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/lib/ProtectedRoute';
import Layout from '@/Layout';

// Pages
import Login          from '@/pages/Login';
import Home           from '@/pages/Home';
import Dashboard      from '@/pages/Dashboard';
import Alerts         from '@/pages/Alerts';
import WaterQuality   from '@/pages/WaterQuality';
import Reports        from '@/pages/Reports';
import HistoryLog     from '@/pages/HistoryLog';
import TreatmentCalculator from '@/pages/TreatmentCalculator';
import SystemsChecklist from '@/pages/SystemsChecklist';
import HealthTreatments from '@/pages/HealthTreatments';
import SpawningSystemTracking from '@/pages/SpawningSystemTracking';
import GroupView      from '@/pages/GroupView';
import Admin          from '@/pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppLayout({ children, pageName }) {
  return (
    <ProtectedRoute>
      <Layout currentPageName={pageName}>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout pageName="Home"><Home /></AppLayout>} />
            <Route path="/dashboard" element={<AppLayout pageName="Dashboard"><Dashboard /></AppLayout>} />
            <Route path="/alerts" element={<AppLayout pageName="Alerts"><Alerts /></AppLayout>} />
            <Route path="/water-quality" element={<AppLayout pageName="WaterQuality"><WaterQuality /></AppLayout>} />
            <Route path="/reports" element={<AppLayout pageName="Reports"><Reports /></AppLayout>} />
            <Route path="/history" element={<AppLayout pageName="HistoryLog"><HistoryLog /></AppLayout>} />
            <Route path="/calculator" element={<AppLayout pageName="TreatmentCalculator"><TreatmentCalculator /></AppLayout>} />
            <Route path="/checklist" element={<AppLayout pageName="SystemsChecklist"><SystemsChecklist /></AppLayout>} />
            <Route path="/health" element={<AppLayout pageName="HealthTreatments"><HealthTreatments /></AppLayout>} />
            <Route path="/spawning" element={<AppLayout pageName="SpawningSystemTracking"><SpawningSystemTracking /></AppLayout>} />
            <Route path="/group-view" element={<AppLayout pageName="GroupView"><GroupView /></AppLayout>} />
            <Route path="/admin" element={<AppLayout pageName="Admin"><Admin /></AppLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
