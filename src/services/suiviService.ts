/**
 * suiviService — observations (maternelle) et compétences (primaire) de l'enfant, pour le profil et
 * les exports PDF. MÊMES sources que Suivi › Apprentissages :
 *  - démo : src/data/demo/suivi.ts ;
 *  - compte réel : table competences (primaire) ; maternelle réelle : rien tant qu'aucune table
 *    d'observations n'existe (jamais de donnée inventée) ; collège / lycée : pas de compétences.
 */

import { getSuiviDemo } from '../data/demo/suivi';
import { getCompetences } from './database';
import { libelleNiveau, ligneSource, type ElementSuivi } from '../utils/competences';
import type { Cycle } from '../utils/niveau';

export async function chargerSuivi(childId: string, demo: boolean, cycle: Cycle | null | undefined): Promise<ElementSuivi[]> {
  if (cycle !== 'maternelle' && cycle !== 'primaire') return [];
  if (demo) return getSuiviDemo(childId);
  if (cycle === 'maternelle') return [];
  const { data } = await getCompetences(childId);
  return data
    .map((c) => ({
      id: c.id,
      domaine: c.domaine,
      texte: c.competence,
      niveau: c.niveau,
      echelle: c.echelle,
      periode: c.periode ?? undefined,
      date: c.date,
      source: c.source,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Ligne prête pour un PDF : échelle de CHAQUE ligne, libellé, source ; jamais de note sur 10. */
export interface LigneSuiviExport {
  domaine: string;
  texte: string;
  niveau?: number;
  echelle?: 3 | 4;
  libelle?: string;
  source: string;
}

export function versExport(items: ElementSuivi[]): LigneSuiviExport[] {
  return items.map((e) => ({
    domaine: e.domaine,
    texte: e.texte,
    niveau: e.niveau,
    echelle: e.echelle,
    libelle: e.niveau && e.echelle ? libelleNiveau(e.niveau, e.echelle) : undefined,
    source: ligneSource(e),
  }));
}
