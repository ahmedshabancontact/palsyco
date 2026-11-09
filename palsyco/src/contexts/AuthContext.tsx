import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import { api } from '../lib/api';
import type { Profile } from '../lib/types';

type Ctx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  adminsExist: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  adminsExist: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminsExist, setAdminsExist] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const r = await api<{ profile: Profile; is_admin: boolean; admins_exist: boolean }>('/api/profile');
      setProfile(r.profile);
      setIsAdmin(r.is_admin);
      setAdminsExist(r.admins_exist);
    } catch (e) {
      console.error('profile load failed', e);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    refreshProfile().finally(() => setLoading(false));
  }, [uid, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, adminsExist, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
