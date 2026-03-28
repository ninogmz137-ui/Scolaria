/**
 * Auth context — wraps the entire app with authentication state.
 *
 * If Supabase is not configured, automatically uses a demo user
 * so the app remains fully functional in demo mode.
 *
 * Now includes role selection (parent, eleve, enseignant).
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────

export type UserRole = 'parent' | 'eleve' | 'enseignant';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, familyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

// ─── Demo user (when Supabase is not configured) ────────

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@scolaria.fr',
  app_metadata: {},
  user_metadata: { family_name: 'Moreau' },
  aud: 'authenticated',
  created_at: '2025-09-01T00:00:00Z',
} as User;

// ─── Context ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const isSupabaseConfigured =
    !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
    !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-');

  const isDemo = !isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: auto-login
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  const handleSignIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const handleSignUp = async (
    email: string,
    password: string,
    familyName: string,
  ) => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { family_name: familyName } },
    });
    if (error) throw error;
  };

  const enterDemoMode = () => {
    setUser(DEMO_USER);
    setSession(null);
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setRole(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemo,
        role,
        setRole,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
