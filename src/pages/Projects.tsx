import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';

export default function Projects() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Organize tasks into projects
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Projects Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Project management features are being developed. 
              For now, you can create and manage tasks directly from the Tasks page.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
