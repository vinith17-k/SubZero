import { useState, useEffect, createContext, useContext } from 'react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { DEMO_USER, DEMO_USER_ID } from '@/lib/mockData';

const DEMO_KEY = 'sz_demo_mode';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check demo mode first (synchronous, instant)
    const demo = localStorage.getItem(DEMO_KEY) === 'true';
    if (demo) {
      setIsDemoMode(true);
      setUser(DEMO_USER as unknown as User);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Real Supabase auth — wrap in try/catch so a dead instance doesn't crash
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch {
        // Supabase unreachable — just leave user null, auth page will offer demo
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    let unsubscribe: (() => void) | undefined;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // ignore if Supabase is dead
    }

    return () => unsubscribe?.();
  }, []);

  const enterDemoMode = () => {
    localStorage.setItem(DEMO_KEY, 'true');
    setIsDemoMode(true);
    setUser(DEMO_USER as unknown as User);
    setSession(null);
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Online sign-in is unavailable. Use Continue offline.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) throw new Error('Online sign-up is unavailable. Use Continue offline.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_KEY);
      setIsDemoMode(false);
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Expose a stable demo user id so hooks can key on it
  const effectiveUser = isDemoMode
    ? ({ ...DEMO_USER, id: DEMO_USER_ID } as unknown as User)
    : user;

  return (
    <AuthContext.Provider value={{ user: effectiveUser, session, loading, isDemoMode, enterDemoMode, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
