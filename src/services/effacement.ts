/**
 * Droit à l'effacement (L7, M25, décision D6) : demande exécutée 30 jours plus tard, annulable jusque-là ;
 * dès la demande, le carnet (ou tout le compte) devient invisible. L'exécution est faite par le serveur
 * (Edge Function « executer-effacements »), jamais par l'app.
 */

import { supabase } from './supabase';

export type Effacement = {
  demande_id: string;
  portee: 'enfant' | 'compte';
  prenom_enfant: string | null;
  demandee_le: string;
  execution_prevue_le: string;
};

export type ApercuEffacementCompte = { prenom_enfant: string; carnet_efface: boolean };

const abonnes = new Set<() => void>();

/** Prévient les écrans (garde « compte en cours d'effacement », listes) après une demande ou une annulation. */
export function surChangementEffacement(cb: () => void): () => void {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}
function prevenir() {
  abonnes.forEach((cb) => cb());
}

export async function mesEffacements(): Promise<Effacement[]> {
  const { data, error } = await supabase.rpc('mes_effacements');
  return error ? [] : ((data ?? []) as Effacement[]);
}

export async function apercuEffacementCompte(): Promise<ApercuEffacementCompte[] | null> {
  const { data, error } = await supabase.rpc('apercu_effacement_compte');
  return error ? null : ((data ?? []) as ApercuEffacementCompte[]);
}

type Resultat = { executionLe: string | null; erreur: string | null };

function traduire(message: string): string {
  if (/plusieurs_responsables/.test(message)) return 'plusieurs_responsables';
  if (/compte_non_famille/.test(message)) return 'compte_non_famille';
  if (/unique|duplicate/i.test(message)) return 'deja_demande';
  return 'indisponible';
}

export async function demanderEffacementEnfant(childId: string): Promise<Resultat> {
  const { data, error } = await supabase.rpc('demander_effacement_enfant', { p_child_id: childId });
  if (error) return { executionLe: null, erreur: traduire(error.message) };
  prevenir();
  return { executionLe: (data as any)?.[0]?.execution_prevue_le ?? null, erreur: null };
}

export async function demanderEffacementCompte(): Promise<Resultat> {
  const { data, error } = await supabase.rpc('demander_effacement_compte');
  if (error) return { executionLe: null, erreur: traduire(error.message) };
  prevenir();
  return { executionLe: (data as any)?.[0]?.execution_prevue_le ?? null, erreur: null };
}

export async function annulerEffacement(demandeId: string): Promise<boolean> {
  const { error } = await supabase.rpc('annuler_effacement', { p_demande_id: demandeId });
  if (!error) prevenir();
  return !error;
}

/** « 28 octobre 2026 » */
export function dateEffacement(iso: string | null): string {
  if (!iso) return 'dans 30 jours';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
