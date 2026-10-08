/**
 * profilService — compte authentifié SANS ligne `profiles` (inscription interrompue ; cas réel : un
 * compte du 21 mars 2026 resté à Londres). Jamais d'écran blanc :
 *  - compte parent (ou sans rôle) : l'app TERMINE l'inscription en créant son profil « parent »
 *    (autorisé par la politique profiles_insert — son propre id — et le trigger M1, qui n'accepte
 *    que « parent » en création directe) ;
 *  - compte enseignant / élève, ou échec : écran « Inscription à terminer » (ProfilIncompletScreen).
 * Testé par `npm run test:profil` (décision) et supabase/tests/r2_profil_manquant.sql (droits).
 */

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { decisionProfil } from './profilDecision';

export type EtatProfil = 'ok' | 'incomplet';

/**
 * Vérifie le profil du compte connecté et termine l'inscription d'un parent si besoin.
 * Réseau indisponible : on ne bloque pas (« ok ») — seul un profil ABSENT de façon certaine bloque.
 */
export async function assurerProfil(user: User): Promise<EtatProfil> {
  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (error) return 'ok';
  const decision = decisionProfil(!!data, user.user_metadata?.role);
  if (decision === 'ok') return 'ok';
  if (decision === 'bloque') return 'incomplet';
  const { error: erreurCreation } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? '',
    family_name: typeof user.user_metadata?.family_name === 'string' ? user.user_metadata.family_name : '',
    role: 'parent',
  });
  return erreurCreation ? 'incomplet' : 'ok';
}
