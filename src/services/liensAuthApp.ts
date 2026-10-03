/**
 * URL de retour des emails d'authentification (L3), construite avec le SCHÉMA de l'app (app.config,
 * lu via expo-constants) : jamais le nom écrit en dur (renommage à venir). Ex. `scolaria://auth/callback`
 * (confirmation, changement d'email) et `scolaria://auth/recuperation` (mot de passe oublié).
 * À déclarer dans Supabase › Authentication › URL Configuration › Redirect URLs (réglage à ta charge).
 */

import Constants from 'expo-constants';
import { CHEMIN_RECUPERATION, CHEMIN_RETOUR_AUTH } from './lienAuth';

function schema(): string {
  const s = Constants.expoConfig?.scheme;
  const valeur = Array.isArray(s) ? s[0] : s;
  if (!valeur) throw new Error('Schéma d’URL de l’app absent (app.config › scheme).');
  return valeur;
}

export function urlRetourAuth(options?: { recuperation?: boolean }): string {
  return `${schema()}://${options?.recuperation ? CHEMIN_RECUPERATION : CHEMIN_RETOUR_AUTH}`;
}
