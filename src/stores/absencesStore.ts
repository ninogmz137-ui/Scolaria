/**
 * absencesStore — signal partagé « les absences de cet enfant ont changé » (lot 4b), sur le modèle de devoirsStore :
 * l'Agenda (carte « Absence ») et l'Accueil (« À justifier ») se rechargent dès qu'une absence est signalée ou
 * justifiée, sans geste particulier. Garde aussi, en mémoire, les absences de la DÉMO (jamais écrites en base).
 *
 * Module pur : aucun import (testé par node, src/stores/absencesStore.test.mts).
 */

type Ecouteur = () => void;

const versions = new Map<string, number>();
const ecouteurs = new Set<Ecouteur>();

export function versionAbsences(childId: string | null | undefined): number {
  return childId ? versions.get(childId) ?? 0 : 0;
}

export function signalerAbsences(childId: string | null | undefined): void {
  if (!childId) return;
  versions.set(childId, versionAbsences(childId) + 1);
  for (const e of [...ecouteurs]) e();
}

export function ecouterAbsences(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

// ─── Démo : absences en mémoire, par enfant (perdues à la fermeture de l'app) ───

const demo = new Map<string, unknown[]>();

export function absencesDemo<T>(childId: string): T[] {
  return (demo.get(childId) ?? []) as T[];
}

export function ajouterAbsenceDemo<T extends { id: string }>(childId: string, a: T): void {
  demo.set(childId, [a, ...(demo.get(childId) ?? [])]);
  signalerAbsences(childId);
}

export function remplacerAbsenceDemo<T extends { id: string }>(childId: string, a: T): void {
  demo.set(childId, (demo.get(childId) ?? []).map((x) => ((x as T).id === a.id ? a : x)));
  signalerAbsences(childId);
}

/** Tests seulement. */
export function reinitialiserAbsencesStore(): void {
  versions.clear();
  ecouteurs.clear();
  demo.clear();
}
