import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DeviceInfo {
  browser: string;
  os: string;
  deviceName: string;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }
  
  // Create device name
  const deviceName = `${browser} on ${os}`;
  
  return { browser, os, deviceName };
}

export function useSessionTracking() {
  const { session, user } = useAuth();
  
  const trackSession = useCallback(async () => {
    if (!session || !user) return;
    
    const deviceInfo = getDeviceInfo();
    const sessionToken = session.access_token.slice(-20); // Use last 20 chars as identifier
    
    try {
      // Check if this session already exists
      const { data: existingSessions } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_token', sessionToken);
      
      if (existingSessions && existingSessions.length > 0) {
        // Update last active time
        await supabase
          .from('user_sessions')
          .update({ 
            last_active_at: new Date().toISOString(),
            is_current: true 
          })
          .eq('id', existingSessions[0].id);
        
        // Set all other sessions as not current
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .neq('id', existingSessions[0].id);
      } else {
        // Mark all existing sessions as not current
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id);
        
        // Create new session record
        await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            device_name: deviceInfo.deviceName,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            is_current: true
          });
      }
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  }, [session, user]);
  
  useEffect(() => {
    trackSession();
  }, [trackSession]);
  
  return { trackSession };
}
