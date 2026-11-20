/**
 * « Le carnet est vide » — règle pure, sans dépendance, testée hors Metro (`npm run test:carnet-vide`).
 *
 * L'Accueil n'affiche la phrase « Le carnet de X est vide » que si TOUT le carnet de l'enfant est vide, y compris ce que
 * l'Accueil lui-même ne montre pas (souvenirs, livrets, jalons, événements lointains, relevés…). Sinon : aucune phrase
 * « vide » (elle serait fausse). Toute erreur de chargement, un chargement en cours ou l'état d'un AUTRE enfant donnent
 * « pas vide » : jamais d'affirmation sans preuve.
 */

/** Tables comptées (RLS : seul ce que le compte peut lire) et leur colonne enfant. */
export const TABLES_CARNET: { table: string; colonne: string }[] = [
  { table: 'carnet_items', colonne: 'child_id' }, // toutes catégories : mot, livret, souvenir, jalon
  { table: 'competences', colonne: 'child_id' }, // compétences et observations
  { table: 'mot_carnets', colonne: 'child_id' }, // mots (signés ou non)
  { table: 'agenda_events', colonne: 'child_id' }, // événements, devoirs, cours, à toute date
  { table: 'grades', colonne: 'child_id' }, // notes (collège / lycée)
  { table: 'bulletins', colonne: 'child_id' },
  { table: 'absences', colonne: 'student_id' },
  { table: 'teacher_conversations', colonne: 'student_id' }, // fils avec l'enseignant
  { table: 'checkins', colonne: 'child_id' }, // relevés du ressenti
];

/** Nombre de lignes par table ; null = la lecture de cette table a échoué. */
export type ComptesCarnet = Record<string, number | null>;

export interface EtatCarnet {
  /** Enfant auquel ces comptes appartiennent. */
  childId: string;
  comptes: ComptesCarnet;
}

/**
 * Vrai seulement si : l'état concerne l'enfant COURANT, aucune erreur ailleurs sur l'écran, et CHAQUE table est lue et à 0.
 * `etat` null = chargement en cours (ou enfant changé : l'état précédent est remis à null avant le nouveau chargement).
 */
export function carnetEstVide(etat: EtatCarnet | null, childIdCourant: string | undefined, erreurAilleurs: boolean): boolean {
  if (!etat || !childIdCourant || etat.childId !== childIdCourant || erreurAilleurs) return false;
  return TABLES_CARNET.every(({ table }) => etat.comptes[table] === 0);
}
