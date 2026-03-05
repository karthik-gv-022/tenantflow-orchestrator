import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Top bar with notifications */}
      <div className="ml-64 fixed top-0 right-0 left-64 h-14 bg-background/95 backdrop-blur border-b z-10 flex items-center justify-end px-6">
        <NotificationBell />
      </div>
      <main className="ml-64 min-h-screen pt-14 p-6 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
