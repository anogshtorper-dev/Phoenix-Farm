// src/Layout.jsx
// Changes from original:
//   - Removed base44 import; user now comes from useAuth()
//   - logout calls auth context logout() instead of base44.auth.logout()
//   - createPageUrl import kept (shim already exists at src/utils/index.ts)
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  AlertTriangle,
  Droplets,
  FileText,
  History as HistoryIcon,
  Calculator,
  Settings,
  Menu,
  Fish,
  CheckSquare,
  HeartPulse,
} from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard',          icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Alerts',             icon: AlertTriangle,   page: 'Alerts' },
    { name: 'Water Quality',      icon: Droplets,        page: 'WaterQuality' },
    { name: 'Reports',            icon: FileText,        page: 'Reports' },
    { name: 'History',            icon: HistoryIcon,     page: 'HistoryLog' },
    { name: 'Calculator',         icon: Calculator,      page: 'TreatmentCalculator' },
    { name: 'Systems Checklist',  icon: CheckSquare,     page: 'SystemsChecklist' },
    { name: 'Health & Treatments',icon: HeartPulse,      page: 'HealthTreatments' },
    { name: 'Spawning System',    icon: Fish,            page: 'SpawningSystemTracking' },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'Admin', icon: Settings, page: 'Admin' });
  }

  if (currentPageName === 'Login') {
    return children;
  }

  const NavigationContent = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/132d88d10_PhoenixFarmLogo.jpg"
            alt="Phoenix Farm Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-teal-700">Phoenix Farm</h1>
            <p className="text-xs text-slate-600 mt-0.5">Pond Monitoring System</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1 min-h-0 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = currentPageName === item.page;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="shrink-0 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              className="text-xs ml-2"
            >
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r shadow-sm h-screen overflow-hidden sticky top-0">
        <NavigationContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[9999] bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/132d88d10_PhoenixFarmLogo.jpg"
              alt="Phoenix Farm Logo"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-lg font-bold text-teal-700">Phoenix Farm</h1>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col h-full overflow-y-auto">
                <NavigationContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 md:pt-0 pt-16 pb-16">
        {children}
      </main>
    </div>
  );
}
