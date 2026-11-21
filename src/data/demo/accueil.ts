/**
 * Utilitaires de l'Accueil et des documents de démo.
 *
 * Depuis le lot 6, le contenu de l'Accueil (À faire, Aujourd'hui et demain, suggestion de l'assistant) est construit par
 * src/utils/accueil.ts, pour la démo comme pour un compte réel, à partir des mêmes données que les autres onglets.
 * Il ne reste ici que des formats de date et le document de démo affiché par SignDoc.
 */

/** Document à signer (démo) : ce que SignDoc affiche. */
export interface DemoDoc {
  title: string;
  date?: string;
  lieu?: string;
  montant?: string;
  deadline?: string;
  aria?: string;
}

export function isoJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « 09:30 » → « 9h30 », « 14:00 » → « 14h ». */
export function heureFr(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}
