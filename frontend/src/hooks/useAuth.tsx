import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/integrations/api/client';
import { Profile, AppRole } from '@/types';

type AuthUser = {
  id: string;
  email?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user?: AuthUser;
};

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await apiClient
        .table('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error) {
        setProfile(data as Profile | null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await apiClient
        .table('user_roles')
        .select('role')
        .eq('user_id', userId);
      setRoles((data || []).map((r: { role: AppRole }) => r.role));
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    apiClient.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch profile and roles in parallel with error handling
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id)
        ]).catch(console.error).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = apiClient.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Defer data fetching to avoid deadlock, run in parallel
          setTimeout(() => {
            Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id)
            ]).catch(console.error);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = async (phone: string) => {
    const { error } = await apiClient.requestOtp({ phone });
    if (error) throw error;
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await apiClient.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await apiClient.signOut();
    if (error) throw error;
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      signInWithPhone,
      verifyOtp,
      signOut,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}




