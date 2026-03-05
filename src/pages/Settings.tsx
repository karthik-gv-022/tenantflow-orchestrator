import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, User, Building, Shield, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppRole } from '@/types';
import { SessionsCard } from '@/components/settings/SessionsCard';
const roleStyles: Record<AppRole, string> = {
  system_admin: 'bg-destructive/20 text-destructive',
  tenant_admin: 'bg-primary/20 text-primary',
  manager: 'bg-accent/20 text-accent-foreground',
  team_lead: 'bg-status-review/20 text-status-review',
  team_member: 'bg-muted text-muted-foreground'
};

const roleLabels: Record<AppRole, string> = {
  system_admin: 'System Admin',
  tenant_admin: 'Tenant Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  team_member: 'Team Member'
};

export default function Settings() {
  const { user, profile, roles } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const initials = fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl || null
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
      
      // Refresh the page to update the auth context
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={fullName} />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium">{fullName || 'Unnamed User'}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to an image for your profile picture
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Roles & Permissions
            </CardTitle>
            <CardDescription>
              Your assigned roles determine what you can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge
                  key={role}
                  variant="secondary"
                  className={cn('text-sm', roleStyles[role])}
                >
                  {roleLabels[role]}
                </Badge>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No roles assigned
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Organization
            </CardTitle>
            <CardDescription>
              Your organization and tenant information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tenant ID</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {profile?.tenant_id || 'N/A'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User ID</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {user?.id || 'N/A'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        <SessionsCard />
      </div>
    </DashboardLayout>
  );
}
