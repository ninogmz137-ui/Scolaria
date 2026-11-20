/**
 * devoirsService — devoirs réels d'un enfant (lot 4a) : agenda_events de type « devoir », du jour de Paris à
 * venir, avec l'auteur et l'heure de chaque coche lus par coches_devoirs (M41) : la base ne les rend qu'aux
 * responsables du foyer de l'auteur (règle des parents séparés) ; hors foyer → « Fait ».
 *
 * Un enfant = un carnet : toujours UN child_id. Base sans M41 (Paris avant le cycle) : coches_devoirs n'existe
 * pas → aucune coche lue, chaque devoir coché s'affiche « Fait » ; rien ne casse.
 * La construction des devoirs (utils/devoirs.construireDevoirs) est la même pour l'Agenda, l'Accueil et les tests.
 */
import { supabase } from './supabase';
import { leverSiErreur } from './erreurs';
import { toggleEventDone } from './database';
import { aujourdhuiParis, heureParisIso, jourParisIso, minuitParis } from '../utils/jourParis';
import {
  auteursDepuisResponsables,
  construireDevoirs,
  type AuteursCoche,
  type CocheLue,
  type Devoir,
} from '../utils/devoirs';
import { signalerDevoirs } from '../stores/devoirsStore';

export { auteurCoche, type AuteursCoche } from '../utils/devoirs';

/** Fonction absente (base sans M41) : PostgREST rend PGRST202. */
function fonctionAbsente(error: { code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST202' || error.code === '42883');
}

/** Coches de l'enfant (auteur et heure masqués hors du foyer de l'auteur). Lève en cas d'échec réel. */
export async function chargerCoches(childId: string): Promise<CocheLue[]> {
  const { data, error } = await supabase.rpc('coches_devoirs', { p_child_id: childId });
  if (fonctionAbsente(error)) return [];
  leverSiErreur(error);
  return (data ?? []) as CocheLue[];
}

/** Devoirs de l'enfant à partir d'aujourd'hui (heure de Paris), par échéance. Lève en cas d'échec. */
export async function chargerDevoirs(childId: string): Promise<Devoir[]> {
  const [lignes, coches] = await Promise.all([
    supabase
      .from('agenda_events')
      .select('*')
      .eq('child_id', childId)
      .eq('event_type', 'devoir')
      .gte('start_time', minuitParis(aujourdhuiParis()).toISOString())
      .order('start_time')
      .limit(200),
    chargerCoches(childId),
  ]);
  leverSiErreur(lignes.error);
  return construireDevoirs((lignes.data ?? []) as any[], coches, jourParisIso, heureParisIso);
}

/** Prénoms des responsables de l'enfant (« vous » pour soi), pour la ligne « Coché par ». */
export async function chargerAuteursCoche(childId: string): Promise<AuteursCoche> {
  const { data, error } = await supabase.rpc('responsables_enfant', { p_child_id: childId });
  leverSiErreur(error);
  return auteursDepuisResponsables((data ?? []) as any[]);
}

/**
 * Coche ou décoche. SEULE fonction de coche de l'app (Accueil, Agenda par jour, vue « Devoirs ») : une fois
 * enregistrée, elle prévient tous les écrans (stores/devoirsStore), qui relisent devoirs ET coches (auteur, heure).
 */
export async function cocherDevoir(id: string, fait: boolean, childId: string): Promise<void> {
  const res = await toggleEventDone(id, fait);
  leverSiErreur(res?.error);
  // Aucune ligne rendue : devoir supprimé entre-temps ou plus accessible → jamais un faux « enregistré ».
  if (!res?.data) throw new Error('devoir introuvable');
  signalerDevoirs(childId);
}
