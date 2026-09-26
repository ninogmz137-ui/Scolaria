/**
 * Supabase client configuration
 *
 * Uses EXPO_PUBLIC_ prefixed env vars so they are
 * available in the React Native bundle at build time.
 */

import { AppState, Linking, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from './getEnv';

const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY — check eas.json env and .env',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed in React Native
  },
});

// Rafraîchissement du jeton lié au premier plan (recommandation Supabase pour React Native) :
// en arrière-plan, les minuteurs JS sont suspendus ; au retour, le jeton est rafraîchi tout de suite
// au lieu d'être utilisé expiré.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (etat) => {
    if (etat === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Développement uniquement : forcer un rafraîchissement du jeton pour tester qu'il ne perturbe
// pas l'écran en cours (adb shell am start -d "scolaria://dev/rafraichir-session").
// Aucun jeton n'est journalisé.
if (__DEV__ && Platform.OS !== 'web') {
  Linking.addEventListener('url', async ({ url }) => {
    if (!url.includes('dev/rafraichir-session')) return;
    const { data, error } = await supabase.auth.refreshSession();
    console.log(
      '[session] rafraîchissement forcé :',
      error ? `échec (${error.message})` : `OK, expire à ${new Date((data.session?.expires_at ?? 0) * 1000).toISOString()}`,
    );
  });
}
