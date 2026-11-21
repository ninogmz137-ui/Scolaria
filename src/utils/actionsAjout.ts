/**
 * Ordre des actions de la feuille « Ajouter » (bouton « + » unique, lot 5).
 * Base (Accueil, Scolarité) : photo · capture · document · jalon · agenda · absence · message.
 * Agenda : absence, agenda, puis le reste. Messages : message, puis le reste (décision du 17 nov.).
 * `rattache` faux (enfant sans classe sur l'app) : ni absence ni message (masqués, jamais grisés ; règle du 21 nov.).
 * Module pur, testé par node (`npm run test:actions-ajout`) : aucun import.
 */

export type ActionAjout = 'photo' | 'capture' | 'document' | 'jalon' | 'agenda' | 'absence' | 'message';
export type OngletFeuille = 'Accueil' | 'Notes' | 'Agenda' | 'MessagerieTab';

const BASE: readonly ActionAjout[] = ['photo', 'capture', 'document', 'jalon', 'agenda', 'absence', 'message'];
const EN_TETE: Record<OngletFeuille, readonly ActionAjout[]> = {
  Accueil: [],
  Notes: [],
  Agenda: ['absence', 'agenda'],
  MessagerieTab: ['message'],
};

export function actionsAjout(onglet: OngletFeuille, rattache: boolean): ActionAjout[] {
  const tete = EN_TETE[onglet] ?? [];
  const ordre = [...tete, ...BASE.filter((a) => !tete.includes(a))];
  return rattache ? ordre : ordre.filter((a) => a !== 'absence' && a !== 'message');
}
