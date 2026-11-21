/**
 * foyer — règle « modifiable par le foyer de l'auteur » (règle des parents séparés du 21 nov. 2026), côté écran.
 * La base applique la même règle (M41 pour les événements, M43 pour les rendez-vous fixes) : l'écran ne fait que
 * ne PAS proposer une action que la base refuserait.
 *
 * Modifiable si : auteur inconnu (vide), auteur = moi, auteur dans un de mes foyers pour cet enfant, ou auteur qui
 * n'est plus responsable de l'enfant (sinon plus personne ne pourrait modifier).
 *
 * Module pur : aucun import (testé par node, src/utils/foyer.test.mts).
 */

export interface ResponsableFoyer {
  user_id: string;
  foyer_id: string;
}

export function modifiableParMonFoyer(
  auteur: string | null | undefined,
  moi: string | null | undefined,
  responsables: ResponsableFoyer[],
): boolean {
  if (!moi) return false;
  if (!auteur || auteur === moi) return true;
  const mesFoyers = new Set(responsables.filter((r) => r.user_id === moi).map((r) => r.foyer_id));
  const foyersAuteur = responsables.filter((r) => r.user_id === auteur).map((r) => r.foyer_id);
  if (foyersAuteur.length === 0) return true;
  return foyersAuteur.some((f) => mesFoyers.has(f));
}
