/**
 * Référentiel officiel — Cycle 2 (CP, CE1, CE2) : disciplines et, pour le français et les
 * mathématiques, leurs composantes (liste validée dans CLAUDE.md, section Suivi).
 *
 * Utilisé partout (démo, listes) : ne jamais réécrire ces intitulés ailleurs.
 */

export const DISCIPLINES_CYCLE_2 = [
  'Français',
  'Mathématiques',
  'Questionner le monde',
  'Enseignement moral et civique',
  'Langue vivante (anglais)',
  'Enseignements artistiques',
  'Éducation physique et sportive',
] as const;

export type DisciplineCycle2 = (typeof DISCIPLINES_CYCLE_2)[number];

export const COMPOSANTES_CYCLE_2: Partial<Record<DisciplineCycle2, readonly string[]>> = {
  'Français': ['Lecture', 'Écriture', 'Oral', 'Vocabulaire', 'Grammaire et orthographe'],
  'Mathématiques': [
    'Nombres, calcul et résolution de problèmes',
    'Grandeurs et mesures',
    'Espace et géométrie',
    'Organisation et gestion de données',
  ],
};
