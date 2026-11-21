/**
 * Référentiel officiel — Cycle 1 (école maternelle : PS, MS, GS).
 *
 * Source : Programme d'enseignement de l'école maternelle (cycle 1), arrêté du 16 avril 2026,
 * BO n° 19 du 7 mai 2026, en vigueur à la rentrée 2026-2027 (annexe, sommaire p. 1 ; liste p. 4).
 * https://www.education.gouv.fr/sites/default/files/document/annexe-programme-d-enseignement-de-l-ecole-maternelle-cycle-1-516107.pdf
 *
 * Intitulés : forme du sommaire et des titres de domaine (le texte de la p. 4 abrège le domaine 1 et
 * écrit « du vivant, des objets et de la matière » pour le domaine 6).
 * Le domaine 1 renvoie au programme publié au BO n° 41 du 31 octobre 2024.
 *
 * Utilisé partout (démo, listes) : ne jamais réécrire ces intitulés ailleurs.
 */

export const DOMAINES_CYCLE_1 = [
  'Le développement et la structuration du langage oral et écrit',
  'Agir, s’exprimer, comprendre à travers les activités physiques',
  'Agir, s’exprimer, comprendre à travers les activités artistiques',
  'L’acquisition des premiers outils mathématiques',
  'Se repérer dans le temps et l’espace',
  'Découvrir le monde du vivant, de la matière et des objets',
] as const;

export type DomaineCycle1 = (typeof DOMAINES_CYCLE_1)[number];
