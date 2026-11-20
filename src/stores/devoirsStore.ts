/**
 * devoirsStore — signal partagé « les devoirs de cet enfant ont changé » (lot 4a, défaut du 20 nov. 2026).
 *
 * Règle : l'Accueil et l'Agenda lisent la même donnée de devoirs (agenda_events, même source) ; une coche faite
 * d'un côté est visible de l'autre dès qu'on y revient, sans geste particulier. Chaque coche (Accueil, Agenda
 * par jour, vue « Devoirs », démo comprise) appelle `signalerDevoirs(childId)` une fois enregistrée ; les écrans
 * abonnés (hook useVersionDevoirs) rechargent alors leurs devoirs.
 *
 * Module pur : aucun import (testé par node, src/stores/devoirsStore.test.mts).
 */

type Ecouteur = () => void;

const versions = new Map<string, number>();
const ecouteurs = new Set<Ecouteur>();

/** Version courante des devoirs d'un enfant (0 tant que rien n'a changé). */
export function versionDevoirs(childId: string | null | undefined): number {
  return childId ? versions.get(childId) ?? 0 : 0;
}

/** À appeler après chaque coche enregistrée (ou basculée en démo) : prévient tous les écrans abonnés. */
export function signalerDevoirs(childId: string | null | undefined): void {
  if (!childId) return;
  versions.set(childId, versionDevoirs(childId) + 1);
  for (const e of [...ecouteurs]) e();
}

/** Abonnement (forme attendue par useSyncExternalStore) ; renvoie la fonction de désabonnement. */
export function ecouterDevoirs(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

/** Tests seulement : remet le magasin à zéro. */
export function reinitialiserDevoirsStore(): void {
  versions.clear();
  ecouteurs.clear();
}
