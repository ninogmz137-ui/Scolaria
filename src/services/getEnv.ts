/**
 * Environment variable helper — guaranteed to work in EAS builds.
 *
 * SÉCURITÉ : uniquement des valeurs publiques (URL + clé anon Supabase). Aucune clé d'API tierce :
 * tout ce qui passe par EXPO_PUBLIC_* / extra est embarqué en clair dans l'APK.
 *
 * Priority:
 *  1. Constants.expoConfig.extra (injected by app.config.js at build time)
 *  2. process.env (Metro inline replacement from .env)
 *
 * This solves the EAS Build problem where .env is gitignored and
 * process.env values are undefined, but eas.json env vars ARE
 * available as OS env → read by app.config.js → injected into extra.
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const ENV = {
  SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

// Startup diagnostics
console.log('[ENV] Source: Constants.extra →', {
  SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
});
console.log('[ENV] Source: process.env →', {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
});
console.log('[ENV] Resolved →', {
  SUPABASE_URL: ENV.SUPABASE_URL ? `${ENV.SUPABASE_URL.substring(0, 20)}...` : 'MISSING',
});
