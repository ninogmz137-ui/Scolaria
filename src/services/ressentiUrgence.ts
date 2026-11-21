/**
 * Bien-être (ressenti) : prépare la ligne à insérer dans `checkins`.
 *
 * Règle absolue (CLAUDE.md) : le texte d'un message de détresse n'est JAMAIS stocké. Si le message déclenche le
 * protocole d'urgence, le ressenti est enregistré SANS le champ `message`, et l'appelant crée une alerte
 * (catégorie + enfant, jamais le texte) par le même chemin que l'assistant.
 *
 * Module PUR, sans import (détecteur fourni par l'appelant) : testé par `npm run test:ressenti-urgence`.
 */

/** Renvoie la catégorie d'urgence d'un texte, ou null. */
export type Detecteur = (texte: string) => string | null;

export function preparerRessenti<T extends { message?: string | null }>(
  ressenti: T,
  detecter: Detecteur,
): { ligne: Omit<T, 'message'> & { message?: string }; urgence: string | null } {
  const { message, ...reste } = ressenti;
  const texte = typeof message === 'string' ? message.trim() : '';
  const urgence = texte ? detecter(texte) : null;
  if (urgence || !texte) return { ligne: reste, urgence };
  return { ligne: { ...reste, message: texte }, urgence: null };
}
