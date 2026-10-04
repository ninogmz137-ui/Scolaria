/**
 * Lecture de `profiles.role` pour le compte connecté (la RLS ne donne que SA ligne). Séparée de roleProfil.ts
 * (pur, testé sans réseau). Un échec (hors ligne, serveur) renvoie « parent » : voir roleProfil.ts.
 */

import { supabase } from './supabase';
import { roleAffiche, type RoleProfil } from './roleProfil';

export async function lireRoleProfil(userId: string): Promise<RoleProfil> {
  try {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    return error ? 'parent' : roleAffiche(data?.role);
  } catch {
    return 'parent';
  }
}
