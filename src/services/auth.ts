/**
 * Authentication service — Supabase Auth
 *
 * Email/password auth for parents with session persistence.
 */

import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// ─── Sign up ─────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  familyName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { family_name: familyName },
    },
  });

  if (error) throw error;

  // Update profile with family name
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ family_name: familyName })
      .eq('id', data.user.id);
  }

  return data;
}

// ─── Sign in ─────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// ─── Sign out ────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Get current session ─────────────────────────────────

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ─── Get current user ────────────────────────────────────

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// ─── Listen to auth state changes ───────────────────────

export function onAuthStateChange(
  callback: (session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

// ─── Get profile ─────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Update profile ──────────────────────────────────────

export async function updateProfile(
  userId: string,
  updates: {
    family_name?: string;
    first_name?: string;
    phone?: string;
    language?: string;
    avatar_url?: string;
  },
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Reset password ──────────────────────────────────────

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
