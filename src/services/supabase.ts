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

/**
 * Délai maximal d'une requête : sans lui, un réseau qui « accroche » laisse l'écran tourner sans fin.
 * Échéance dépassée → AbortError → classé « Pas de connexion » (erreurs.ts) avec « Réessayer ».
 * Fichiers et fonctions (Aria, import) : délai plus long.
 */
const fetchAvecDelai: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const delai = /\/(storage|functions)\/v1\//.test(url) ? 90_000 : 25_000;
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), delai);
  // Annulation demandée par l'appelant : on la propage au contrôleur du délai.
  init?.signal?.addEventListener?.('abort', () => controleur.abort());
  return fetch(input, { ...init, signal: controleur.signal }).finally(() => clearTimeout(minuteur));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchAvecDelai },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed in React Native
    // Flux PKCE (L3) : les liens des emails renvoient un `code` échangé dans l'app (LiensAuthRouteur).
    flowType: 'pkce',
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
