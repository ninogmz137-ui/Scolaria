/**
 * Auth context — manages authentication state for the entire app.
 *
 * Roles:
 *   - 'parent'      → email+password login → child selector → full access
 *   - 'enseignant'  → email+password login → teacher dashboard directly
 *   - 'enfant-pin'  → PIN entry → sandbox (limited navigation)
 *   - 'eleve'       → email+password login (autonomous teen) → student space
 *
 * If Supabase is not configured, auto-enters demo mode as parent.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { ENV } from '../services/getEnv';

// ─── Types ────────────────────────────────────────────────

export type UserRole = 'parent' | 'eleve' | 'enseignant' | 'enfant-pin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, familyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
  enterChildMode: () => void;
  exitChildMode: () => void;
  verifyParentPassword: (password: string) => Promise<boolean>;
}

// ─── Demo user (when Supabase is not configured) ────────

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@scolaria.fr',
  app_metadata: {},
  user_metadata: { family_name: 'Moreau', role: 'parent' },
  aud: 'authenticated',
  created_at: '2025-09-01T00:00:00Z',
} as User;

// Demo teacher user
const DEMO_TEACHER: User = {
  id: 'demo-teacher-001',
  email: 'prof@scolaria.fr',
  app_metadata: {},
  user_metadata: { family_name: 'Laurent', role: 'enseignant' },
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
  const [isDemoMode, setIsDemoMode] = useState(false);

  const isSupabaseConfigured =
    !!ENV.SUPABASE_URL &&
    !ENV.SUPABASE_URL.includes('your-');

  // isDemo is true if Supabase not configured OR user explicitly entered demo mode
  const isDemo = !isSupabaseConfigured || isDemoMode;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: don't auto-login, wait for user interaction
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Detect role from user metadata
        const metaRole = s.user.user_metadata?.role;
        if (metaRole === 'enseignant') {
          setRole('enseignant');
        } else if (metaRole === 'eleve') {
          setRole('eleve');
        } else {
          setRole('parent');
        }
      }
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
      // Demo mode: detect role by email
      if (email.includes('prof') || email.includes('enseignant') || email.includes('teacher')) {
        setUser(DEMO_TEACHER);
        setRole('enseignant');
      } else {
        setUser(DEMO_USER);
        setRole('parent');
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Detect role from user metadata
    const metaRole = data.user?.user_metadata?.role;
    if (metaRole === 'enseignant') {
      setRole('enseignant');
    } else if (metaRole === 'eleve') {
      setRole('eleve');
    } else {
      setRole('parent');
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    familyName: string,
  ) => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER);
      setRole('parent');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { family_name: familyName, role: 'parent' } },
    });
    if (error) throw error;
  };

  const enterDemoMode = () => {
    setUser(DEMO_USER);
    setRole('parent');
    setSession(null);
    setIsDemoMode(true);
  };

  const enterChildMode = () => {
    // Enter sandbox mode — user stays the same (parent's device)
    // but role switches to enfant-pin
    if (!user) {
      // If no user yet (direct PIN from login screen), use demo
      setUser(DEMO_USER);
    }
    setRole('enfant-pin');
  };

  const exitChildMode = () => {
    // Return to parent mode — requires password verification first
    setRole('parent');
  };

  const verifyParentPassword = async (password: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      // Demo mode: accept "password" or "demo"
      return password === 'password' || password === 'demo' || password.length >= 6;
    }

    // Re-authenticate with Supabase
    try {
      const email = user?.email;
      if (!email) return false;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    } catch {
      return false;
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured || isDemoMode) {
      setUser(null);
      setRole(null);
      setIsDemoMode(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRole(null);
    setIsDemoMode(false);
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
        enterChildMode,
        exitChildMode,
        verifyParentPassword,
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
