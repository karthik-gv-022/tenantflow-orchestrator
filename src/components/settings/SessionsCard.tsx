import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Loader2, 
  Trash2, 
  Shield,
  Globe,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserSession {
  id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

function getDeviceIcon(os: string | null) {
  if (!os) return <Monitor className="w-5 h-5" />;
  
  const lowerOs = os.toLowerCase();
  if (lowerOs.includes('android') || lowerOs.includes('ios')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (lowerOs.includes('ipad')) {
    return <Tablet className="w-5 h-5" />;
  }
  return <Monitor className="w-5 h-5" />;
}

export function SessionsCard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    setRevokingAll(true);
    try {
      const currentSession = sessions.find(s => s.is_current);
      if (!currentSession) {
        toast.error('Could not identify current session');
        return;
      }

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user?.id)
        .neq('id', currentSession.id);
      
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.is_current));
      toast.success('All other sessions have been revoked');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const otherSessions = sessions.filter(s => !s.is_current);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across devices
            </CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={revokingAll}>
                  {revokingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Revoke All Others
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out from all other devices. You'll remain signed in on this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={revokeAllOtherSessions}>
                    Revoke All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active sessions found
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div key={session.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getDeviceIcon(session.os)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {session.device_name || 'Unknown Device'}
                        </span>
                        {session.is_current && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.browser || 'Unknown'} • {session.os || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last active {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      disabled={revoking === session.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {revoking === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
