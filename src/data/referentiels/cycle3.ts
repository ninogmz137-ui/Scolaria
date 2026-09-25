/**
 * Référentiel officiel — Cycle 3, écoles (CM1, CM2) : disciplines (liste validée pour B3a).
 *
 * Utilisé partout (démo, listes) : ne jamais réécrire ces intitulés ailleurs.
 */

export const DISCIPLINES_CYCLE_3 = [
  'Français',
  'Mathématiques',
  'Langues vivantes',
  'Histoire et géographie',
  'Sciences et technologie',
  'Enseignement moral et civique',
  'Arts plastiques',
  'Éducation musicale',
  'Histoire des arts',
  'Éducation physique et sportive',
] as const;

export type DisciplineCycle3 = (typeof DISCIPLINES_CYCLE_3)[number];
