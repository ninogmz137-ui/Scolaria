/**
 * evenementsService — modifier et supprimer un événement de l'Agenda créé par un parent (lot 4c, règle du 21 nov. 2026).
 * Seul le foyer de l'auteur peut le faire (M41 : déclencheur agenda_events_verrou_foyer et politique agenda_delete) ;
 * la coche « fait » reste à tous les responsables. Un enfant = un carnet : toujours UN child_id.
 */
import { supabase } from './supabase';
import { classerErreur, leverSiErreur } from './erreurs';
import { signalerDevoirs } from '../stores/devoirsStore';
import type { ResponsableFoyer } from '../utils/foyer';

export class ErreurEvenement extends Error {}

const REFUS = 'Seul le foyer qui a ajouté cet événement peut le modifier ou le supprimer.';

function erreur(error: { code?: string } | null | unknown, defaut: string): ErreurEvenement {
  if ((error as { code?: string } | null)?.code === '42501') return new ErreurEvenement(REFUS);
  const type = classerErreur(error);
  if (type === 'reseau') return new ErreurEvenement('Pas de connexion : rien n’a été enregistré. Réessayez quand le réseau est revenu.');
  if (type === 'session') return new ErreurEvenement('Votre session a expiré : reconnectez-vous, puis recommencez.');
  return new ErreurEvenement(defaut);
}

/** Responsables de l'enfant et leur foyer (lisible par tous les responsables de l'enfant). */
export async function chargerResponsablesFoyer(childId: string): Promise<ResponsableFoyer[]> {
  const { data, error } = await supabase.from('responsables').select('user_id, foyer_id').eq('child_id', childId);
  leverSiErreur(error);
  return ((data ?? []) as { user_id: string; foyer_id: string }[]).map((r) => ({ user_id: String(r.user_id), foyer_id: String(r.foyer_id) }));
}

export interface ModificationEvenement {
  title: string;
  event_type: string;
  start_time: string;
}

export async function modifierEvenement(id: string, childId: string, m: ModificationEvenement): Promise<void> {
  const { data, error } = await supabase.from('agenda_events').update({ ...m, updated_at: new Date().toISOString() }).eq('id', id).select('id');
  if (error) throw erreur(error, 'Modification impossible. Réessayez.');
  if (!data?.length) throw new ErreurEvenement(REFUS);
  signalerDevoirs(childId);
}

export async function supprimerEvenement(id: string, childId: string): Promise<void> {
  const { data, error } = await supabase.from('agenda_events').delete().eq('id', id).select('id');
  if (error) throw erreur(error, 'Suppression impossible. Réessayez.');
  if (!data?.length) throw new ErreurEvenement(REFUS);
  signalerDevoirs(childId);
}
