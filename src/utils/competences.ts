/**
 * Compétences et observations (maternelle / primaire) : échelle, période, libellés — partagés par le
 * Suivi et l'Accueil, en démo comme en compte réel (COMPONENTS.md §17).
 *
 * Chaque évaluation garde SON échelle (3 ou 4 niveaux), fixée à la saisie : une même page peut
 * mélanger des lignes à 3 et à 4 segments (école précédente, recopie d'un document papier…).
 */

export type Echelle = 3 | 4;
export type Decoupage = 'periodes' | 'semestres' | 'trimestres';

/** Libellés sous la barre (§17). Index = niveau - 1. */
export const LIBELLES_ECHELLE: Record<Echelle, readonly string[]> = {
  3: ['Non acquis', 'Partiellement acquis', 'Acquis'],
  4: ['Non atteint', 'Partiellement atteint', 'Atteint', 'Dépassé'],
};

export function libelleNiveau(niveau: number, echelle: Echelle): string {
  return LIBELLES_ECHELLE[echelle][niveau - 1] ?? '';
}

/** Élément du Suivi : compétence (primaire, avec niveau) ou observation (maternelle, sans niveau). */
export interface ElementSuivi {
  id: string;
  /** Domaine (maternelle) ou discipline (primaire), intitulé du référentiel officiel. */
  domaine: string;
  texte: string;
  /** Primaire uniquement : 1..echelle. */
  niveau?: number;
  echelle?: Echelle;
  /** Numéro de période / semestre (cohérent avec le découpage de l'année). */
  periode?: number;
  /** YYYY-MM-DD */
  date: string;
  /** « ecole » : saisi par l'enseignant ; « parent » : recopié par le responsable (document papier). */
  source: 'ecole' | 'parent';
  /** Enseignant qui a saisi (source « ecole »). */
  auteur?: string;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 2026-09-19 » → « 19 sept. » */
export function jourMois(iso: string): string {
  const [, m, j] = iso.split('-').map(Number);
  return `${j} ${MOIS[m - 1]}`;
}

/** Ligne source obligatoire : « Saisi par Mme Dupont · 19 sept. » / « Recopié par vous · 12 sept. ». */
export function ligneSource(e: Pick<ElementSuivi, 'source' | 'auteur' | 'date'>, parLeParentConnecte = true): string {
  const qui = e.source === 'ecole'
    ? `Saisi par ${e.auteur ?? 'l’école'}`
    : parLeParentConnecte ? 'Recopié par vous' : 'Recopié par un responsable';
  return `${qui} · ${jourMois(e.date)}`;
}

/** Nombre de périodes du découpage (P1-P5, S1-S2, T1-T3). */
export function nombrePeriodes(decoupage: Decoupage): number {
  return decoupage === 'semestres' ? 2 : decoupage === 'trimestres' ? 3 : 5;
}

/**
 * Libellé d'une période au Suivi maternelle / primaire : « P1 », « S2 »… Trimestres (seulement si
 * l'école les a choisis, jamais par défaut) : en toutes lettres, « 1er trimestre » — jamais « T1 ».
 */
export function libellePeriode(decoupage: Decoupage, n: number): string {
  if (decoupage === 'trimestres') return `${n === 1 ? '1er' : `${n}e`} trimestre`;
  return `${decoupage === 'semestres' ? 'S' : 'P'}${n}`;
}

/**
 * Période en cours (calendrier scolaire usuel) : P1 rentrée → Toussaint, P2 → Noël, P3 → hiver,
 * P4 → printemps, P5 → juillet ; S1 septembre → janvier, S2 février → juillet.
 */
export function periodeCourante(decoupage: Decoupage, jour = new Date()): number {
  const m = jour.getMonth() + 1;
  const j = jour.getDate();
  if (decoupage === 'semestres') return m >= 9 || m === 1 ? 1 : 2;
  if (decoupage === 'trimestres') return m >= 9 ? 1 : m <= 3 ? 2 : 3;
  if (m === 9 || (m === 10 && j <= 20)) return 1; // rentrée → Toussaint
  if (m >= 10) return 2;                           // Toussaint → Noël
  if (m === 1 || (m === 2 && j <= 20)) return 3;   // Noël → vacances d'hiver
  if (m <= 4) return 4;                            // hiver → printemps
  return 5;                                        // printemps → été
}
