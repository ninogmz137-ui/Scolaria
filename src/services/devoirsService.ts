/**
 * devoirsService — devoirs réels d'un enfant (lot 4a) : agenda_events de type « devoir », du jour de Paris à
 * venir, avec l'auteur et l'heure de la coche (fait_par / fait_le, M41, posés par le serveur).
 *
 * Un enfant = un carnet : la requête porte toujours sur UN child_id. Base sans M41 (Paris avant le cycle) :
 * `select('*')` ne renvoie simplement pas fait_par / fait_le → pas de ligne « Coché par », rien ne casse.
 */
import { supabase } from './supabase';
import { leverSiErreur } from './erreurs';
import { toggleEventDone } from './database';
import { aujourdhuiParis, heureParis, jourParis, minuitParis } from '../utils/jourParis';
import type { Devoir } from '../utils/devoirs';

/** Prénoms des responsables de l'enfant, par identifiant de compte ; « vous » pour le compte connecté. */
export type AuteursCoche = Record<string, string>;

function versDevoir(r: any): Devoir {
  const debut = new Date(r.start_time);
  const faitLe = r.fait_le ? new Date(r.fait_le) : null;
  return {
    id: String(r.id),
    titre: String(r.title ?? ''),
    matiere: r.subject ? String(r.subject) : undefined,
    jour: jourParis(debut),
    fait: !!r.is_done,
    faitPar: r.fait_par ? String(r.fait_par) : null,
    faitJour: faitLe ? jourParis(faitLe) : null,
    faitHeure: faitLe ? heureParis(faitLe) : null,
  };
}

/** Devoirs de l'enfant à partir d'aujourd'hui (heure de Paris), par échéance. Lève en cas d'échec. */
export async function chargerDevoirs(childId: string): Promise<Devoir[]> {
  const { data, error } = await supabase
    .from('agenda_events')
    .select('*')
    .eq('child_id', childId)
    .eq('event_type', 'devoir')
    .gte('start_time', minuitParis(aujourdhuiParis()).toISOString())
    .order('start_time')
    .limit(200);
  leverSiErreur(error);
  return ((data ?? []) as any[]).map(versDevoir);
}

/** Prénoms des responsables de l'enfant (« vous » pour soi), pour la ligne « Coché par ». */
export async function chargerAuteursCoche(childId: string): Promise<AuteursCoche> {
  const { data, error } = await supabase.rpc('responsables_enfant', { p_child_id: childId });
  leverSiErreur(error);
  const auteurs: AuteursCoche = {};
  for (const r of (data ?? []) as any[]) {
    const prenom = String(r.prenom ?? '').trim();
    auteurs[String(r.user_id)] = r.est_moi ? 'vous' : prenom || '';
  }
  return auteurs;
}

/** Coche ou décoche ; renvoie le devoir tel que le serveur l'a enregistré (auteur et heure compris). */
export async function cocherDevoir(id: string, fait: boolean): Promise<Devoir> {
  const res = await toggleEventDone(id, fait);
  leverSiErreur(res?.error);
  // Aucune ligne rendue : devoir supprimé entre-temps ou plus accessible → jamais un faux « enregistré ».
  if (!res?.data) throw new Error('devoir introuvable');
  return versDevoir(res.data);
}

/** Nom affiché de l'auteur d'une coche, ou null si inconnu (ancien responsable, compte effacé, base sans M41). */
export function auteurCoche(faitPar: string | null | undefined, auteurs: AuteursCoche): string | null {
  if (!faitPar) return null;
  return auteurs[faitPar] || null;
}
