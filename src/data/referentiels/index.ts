/**
 * Référentiels officiels : un fichier par cycle, et ce point d'entrée unique pour savoir quelle liste
 * s'applique à un niveau (PS → CM2). Collège / lycée : matières de l'établissement (notes /20).
 */

import { normaliserNiveau } from '../../utils/niveau';
import { DOMAINES_CYCLE_1 } from './cycle1';
import { DISCIPLINES_CYCLE_2 } from './cycle2';
import { DISCIPLINES_CYCLE_3 } from './cycle3';

export { DOMAINES_CYCLE_1 } from './cycle1';
export { DISCIPLINES_CYCLE_2, COMPOSANTES_CYCLE_2 } from './cycle2';
export { DISCIPLINES_CYCLE_3 } from './cycle3';

export type CycleOfficiel = 1 | 2 | 3;

/** Cycle officiel d'un niveau d'école (1 : PS-GS, 2 : CP-CE2, 3 : CM1-CM2), ou null (collège, lycée, inconnu). */
export function cycleOfficiel(niveau: string | null | undefined): CycleOfficiel | null {
  const n = normaliserNiveau(niveau);
  if (n === 'PS' || n === 'MS' || n === 'GS') return 1;
  if (n === 'CP' || n === 'CE1' || n === 'CE2') return 2;
  if (n === 'CM1' || n === 'CM2') return 3;
  return null;
}

/** Domaines (maternelle) ou disciplines (élémentaire) du niveau, dans l'ordre officiel. */
export function referentielDuNiveau(niveau: string | null | undefined): readonly string[] {
  switch (cycleOfficiel(niveau)) {
    case 1: return DOMAINES_CYCLE_1;
    case 2: return DISCIPLINES_CYCLE_2;
    case 3: return DISCIPLINES_CYCLE_3;
    default: return [];
  }
}
