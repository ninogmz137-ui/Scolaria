/**
 * Environment variable helper — guaranteed to work in EAS builds.
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
  ANTHROPIC_API_KEY: extra.EXPO_PUBLIC_ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  GOOGLE_VISION_KEY: extra.EXPO_PUBLIC_GOOGLE_VISION_KEY || process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY || '',
} as const;

// Startup diagnostics
console.log('[ENV] Source: Constants.extra →', {
  SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
  ANTHROPIC_API_KEY: extra.EXPO_PUBLIC_ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
});
console.log('[ENV] Source: process.env →', {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
  ANTHROPIC_API_KEY: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
});
console.log('[ENV] Resolved →', {
  SUPABASE_URL: ENV.SUPABASE_URL ? `${ENV.SUPABASE_URL.substring(0, 20)}...` : 'MISSING',
  ANTHROPIC_API_KEY: ENV.ANTHROPIC_API_KEY ? `${ENV.ANTHROPIC_API_KEY.substring(0, 12)}...` : 'MISSING',
});
