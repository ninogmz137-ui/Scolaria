/**
 * Livrets de démo (famille Moreau) — MODE DÉMO UNIQUEMENT. Univers : voir l'en-tête de suivi.ts.
 *
 * Décision du 26 sept 2026 : aucun document inventé. En début d'année, seul Lucas a un document
 * réel à cette date : sa fiche des évaluations nationales « Repères CM2 ».
 *
 * Source officielle (lue le 25 sept 2026) — DEPP, « Évaluations nationales Repères CP-CE1-CE2-CM1-CM2,
 * septembre 2026 », diaporama de présentation, eduscol :
 * https://eduscol.education.gouv.fr/sites/default/files/document/educationnationalereperes26diaporama-de-presentation-128812.pdf
 *  - diapo 3 : Repères CP, CE1, CE2, CM1, CM2 en début d'année ; Point d'étape CP à mi-année ;
 *  - diapo 4 : passation du 7 au 18 septembre 2026 ; résultats (CP-CE1-CE2-CM2) à partir du lundi 21 sept. ;
 *  - diapo 5 : français et mathématiques ;
 *  - diapos 30-32 : restitution aux parents, une fiche de positionnement par discipline.
 * Léa (GS) et Emma (3e) ne sont pas concernées par ces évaluations.
 */

import type { ElementCarnet } from '../../services/carnetService';

/** Année de la rentrée en cours (septembre → août). */
function anneeRentree(jour: Date): number {
  return jour.getMonth() >= 8 ? jour.getFullYear() : jour.getFullYear() - 1;
}

function iso(a: number, m: number, j: number): string {
  return `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

export function getLivretsDemo(childId: string | undefined, aujourdHui = new Date()): ElementCarnet[] {
  if (childId !== 'demo-lucas') return [];
  const a = anneeRentree(aujourdHui);
  const resultats = new Date(a, 8, 21); // résultats disponibles à partir du 21 septembre
  if (aujourdHui < resultats) return [];
  // Fiche remise quelques jours après l'ouverture des résultats (jamais dans le futur).
  const remise = new Date(Math.min(aujourdHui.getTime(), new Date(a, 8, 24).getTime()));
  return [
    {
      id: 'lucas-reperes-cm2',
      categorie: 'livret',
      type: 'evaluation_nationale',
      titre: `Repères CM2 · septembre ${a}`,
      note: 'Évaluations nationales de début d’année, en français et en mathématiques. Une fiche de positionnement par discipline.',
      date: iso(remise.getFullYear(), remise.getMonth() + 1, remise.getDate()),
      source: 'ecole',
      auteur: 'Mme Dupont',
      visibilite: 'foyer',
    },
  ];
}
