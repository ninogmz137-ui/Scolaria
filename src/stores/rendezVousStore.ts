/**
 * rendezVousStore — signal partagé « les rendez-vous fixes de cet enfant ont changé » (lot 4c), sur le modèle de
 * devoirsStore : l'Agenda se recharge après chaque création, modification, suppression ou coche « À prévoir ».
 * Garde aussi, en mémoire, les rendez-vous et coches de la DÉMO (jamais écrits en base).
 *
 * Module pur : aucun import.
 */

type Ecouteur = () => void;

const versions = new Map<string, number>();
const ecouteurs = new Set<Ecouteur>();

export function versionRendezVous(childId: string | null | undefined): number {
  return childId ? versions.get(childId) ?? 0 : 0;
}

export function signalerRendezVous(childId: string | null | undefined): void {
  if (!childId) return;
  versions.set(childId, versionRendezVous(childId) + 1);
  for (const e of [...ecouteurs]) e();
}

export function ecouterRendezVous(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

// ─── Démo : état en mémoire, par enfant ───

export interface EtatDemo<R, C> {
  rdvs: R[];
  coches: C[];
}

const demo = new Map<string, EtatDemo<unknown, unknown>>();

export function etatDemo<R, C>(childId: string, initial: () => EtatDemo<R, C>): EtatDemo<R, C> {
  if (!demo.has(childId)) demo.set(childId, initial() as EtatDemo<unknown, unknown>);
  return demo.get(childId) as EtatDemo<R, C>;
}

export function majDemo<R, C>(childId: string, etat: EtatDemo<R, C>): void {
  demo.set(childId, etat as EtatDemo<unknown, unknown>);
  signalerRendezVous(childId);
}
