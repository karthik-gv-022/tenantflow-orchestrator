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
    const sessionToken = session.access_token.slice(-20);
    
    try {
      // Use upsert to reduce queries - single operation instead of check + update/insert
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_token: sessionToken,
          device_name: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          last_active_at: new Date().toISOString(),
          is_current: true
        }, {
          onConflict: 'user_id,session_token'
        });
      
      if (error) throw error;
      
      // Mark other sessions as not current (fire and forget)
      supabase
        .from('user_sessions')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .neq('session_token', sessionToken)
        .then(() => {}); // Don't await, run in background
        
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  }, [session, user]);
  
  useEffect(() => {
    trackSession();
  }, [trackSession]);
  
  return { trackSession };
}
