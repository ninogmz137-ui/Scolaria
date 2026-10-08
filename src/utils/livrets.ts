/**
 * Livrets — textes d'état vide (décision du 26 sept 2026 : états vides INFORMATIFS, aucun document
 * inventé) et libellé long d'une période.
 */

import type { Cycle } from './niveau';
import type { Decoupage } from './competences';

/** « Période 1 », « 1er semestre », « 1er trimestre » — jamais « T1 » en maternelle / primaire. */
export function libellePeriodeLong(decoupage: Decoupage, n: number): string {
  const rang = n === 1 ? '1er' : `${n}e`;
  if (decoupage === 'semestres') return `${rang} semestre`;
  if (decoupage === 'trimestres') return `${rang} trimestre`;
  return `Période ${n}`;
}

/** Niveau affiché dans une phrase : « 3ème » → « 3e », « 1ère » → « 1re ». */
function niveauCourt(niveau: string): string {
  return niveau.replace(/ème$/, 'e').replace(/^1ère$/, '1re');
}

/** Ce qu'on dit quand l'année en cours n'a encore aucun livret. */
export function videLivrets(niveau: string | null | undefined, cycle: Cycle | null | undefined, decoupage: Decoupage): string {
  if (cycle === 'college' || cycle === 'lycee') {
    const quand = decoupage === 'semestres' ? '1er semestre' : '1er trimestre';
    return `Premier bulletin de ${niveau ? niveauCourt(niveau) : 'l’année'} : à la fin du ${quand}.`;
  }
  if (niveau === 'GS') return 'Synthèse des acquis de fin de maternelle : en juin.';
  return 'Aucun livret pour l’instant cette année.';
}
