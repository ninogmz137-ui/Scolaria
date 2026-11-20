/**
 * Contenu des années ARCHIVÉES de démo (famille Moreau) — MODE DÉMO UNIQUEMENT, lecture seule.
 * Années : src/data/demo/parcours.ts. Dates relatives à la rentrée en cours (a).
 *
 *  - Lucas CM1 (a-1, École Condorcet) : 4 niveaux LSU et semestres → ses compétences s'affichent
 *    sur 4 segments, pendant que le CM2 en cours (École Voltaire) reste à 3. Le carnet suit l'enfant.
 *  - Léa MS (a-1) : observations par domaine, sans niveau.
 *  - Emma 4e (a-1) : bulletins trimestriels (demo-archived-grades.json, classe « 4ème »).
 *  - Années « importées » : documents scannés par la famille.
 * Archives : pas d'alerte, pas de Score de Joie.
 */

import demoArchivedGrades from './demo-archived-grades.json';
import { DISCIPLINES_CYCLE_3, DOMAINES_CYCLE_1 } from '../referentiels';
import type { ElementSuivi } from '../../utils/competences';
import type { ElementCarnet } from '../../services/carnetService';
import { anneeRentree } from './parcours';

export interface BulletinArchive {
  trimestre: 1 | 2 | 3;
  moyenne: number;
  matieres: { nom: string; moyenne: number }[];
  appreciation?: string;
}

export interface ArchiveDemo {
  items: ElementSuivi[];
  livrets: ElementCarnet[];
  bulletins: BulletinArchive[];
}

const VIDE: ArchiveDemo = { items: [], livrets: [], bulletins: [] };

function iso(a: number, m: number, j: number): string {
  return `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

const [FR, MATHS, LV, HG, SCI, , , , , EPS] = DISCIPLINES_CYCLE_3;
const [LANGAGE, ACT_PHYS, ACT_ART, MATHS_M, TEMPS_ESPACE, MONDE] = DOMAINES_CYCLE_1;

function lucasCM1(a: number): ArchiveDemo {
  // Année a-1 → a. S1 : octobre à janvier ; S2 : février à juin.
  const c = (id: string, domaine: string, texte: string, niveau: number, periode: 1 | 2, date: string): ElementSuivi => ({
    id, domaine, texte, niveau, echelle: 4, periode, date, source: 'ecole', auteur: 'M. Benali',
  });
  return {
    items: [
      c('l1-1', FR, 'Lire à voix haute avec fluidité', 3, 1, iso(a - 1, 11, 14)),
      c('l1-2', FR, 'Écrire un texte court en respectant les accords', 2, 1, iso(a - 1, 12, 5)),
      c('l1-3', MATHS, 'Multiplier des nombres entiers', 3, 1, iso(a - 1, 11, 21)),
      c('l1-4', MATHS, 'Comprendre les fractions simples', 2, 1, iso(a, 1, 16)),
      c('l1-5', SCI, 'Décrire les états de l’eau', 4, 1, iso(a - 1, 10, 10)),
      c('l1-6', EPS, 'Nager 25 mètres', 3, 1, iso(a - 1, 12, 12)),
      c('l1-7', FR, 'Rédiger un récit d’une page', 3, 2, iso(a, 5, 22)),
      c('l1-8', MATHS, 'Résoudre des problèmes en deux étapes', 3, 2, iso(a, 4, 3)),
      c('l1-9', MATHS, 'Utiliser les nombres décimaux', 2, 2, iso(a, 6, 5)),
      c('l1-10', HG, 'Situer les grandes périodes historiques', 3, 2, iso(a, 3, 20)),
      c('l1-11', LV, 'Se présenter à l’oral en anglais', 4, 2, iso(a, 5, 15)),
    ],
    livrets: [
      {
        id: 'l1-lsu2', categorie: 'livret', type: 'livret', titre: 'Livret scolaire (LSU) · 2e semestre',
        date: iso(a, 6, 26), source: 'ecole', auteur: 'M. Benali', visibilite: 'foyer',
      },
      {
        id: 'l1-lsu1', categorie: 'livret', type: 'livret', titre: 'Livret scolaire (LSU) · 1er semestre',
        date: iso(a, 1, 30), source: 'ecole', auteur: 'M. Benali', visibilite: 'foyer',
      },
      {
        id: 'l1-reperes', categorie: 'livret', type: 'evaluation_nationale', titre: `Repères CM1 · septembre ${a - 1}`,
        note: 'Évaluations nationales de début d’année, en français et en mathématiques.',
        date: iso(a - 1, 9, 24), source: 'ecole', auteur: 'M. Benali', visibilite: 'foyer',
      },
    ],
    bulletins: [],
  };
}

function leaMS(a: number): ArchiveDemo {
  const o = (id: string, domaine: string, texte: string, date: string): ElementSuivi => ({
    id, domaine, texte, date, source: 'ecole', auteur: 'Mme Roche',
  });
  return {
    items: [
      o('m1', LANGAGE, 'Participe aux échanges en petit groupe.', iso(a - 1, 11, 18)),
      o('m2', ACT_PHYS, 'Lance et rattrape un ballon avec les deux mains.', iso(a, 2, 6)),
      o('m3', ACT_ART, 'Chante une comptine en entier avec la classe.', iso(a - 1, 12, 15)),
      o('m4', MATHS_M, 'Compte jusqu’à 5 en montrant les objets.', iso(a, 3, 19)),
      o('m5', TEMPS_ESPACE, 'Reconnaît le matin et l’après-midi.', iso(a, 5, 12)),
      o('m6', MONDE, 'Plante une graine et observe qu’elle pousse.', iso(a, 4, 9)),
    ],
    livrets: [
      {
        id: 'm-carnet', categorie: 'livret', type: 'livret', titre: 'Carnet de suivi des apprentissages · MS',
        date: iso(a, 6, 30), source: 'ecole', auteur: 'Mme Roche', visibilite: 'foyer',
      },
    ],
    bulletins: [],
  };
}

function emma4e(): ArchiveDemo {
  const bulletins = (demoArchivedGrades as { childId: string; class: string; trimester: number; average: number; subjects: { name: string; average: number }[]; appreciation: string }[])
    .filter((b) => b.childId === 'demo-emma' && b.class === '4ème')
    .sort((x, y) => x.trimester - y.trimester)
    .map((b) => ({
      trimestre: b.trimester as 1 | 2 | 3,
      moyenne: b.average,
      matieres: b.subjects.map((s) => ({ nom: s.name, moyenne: s.average })),
      appreciation: b.appreciation,
    }));
  return { items: [], livrets: [], bulletins };
}

function scanne(id: string, titre: string, date: string): ArchiveDemo {
  return {
    items: [],
    livrets: [{ id, categorie: 'livret', type: 'livret', titre, date, source: 'parent', scanne: true, visibilite: 'foyer' }],
    bulletins: [],
  };
}

/** Contenu d'une année archivée ou importée de démo (vide si inconnue). */
export function getArchiveDemo(anneeId: string, jour = new Date()): ArchiveDemo {
  const a = anneeRentree(jour);
  switch (anneeId) {
    case 'lucas-y1': return lucasCM1(a);
    case 'lucas-y2': return scanne('l2-lsu', 'Livret scolaire (LSU) · 2e semestre', iso(a - 1, 6, 28));
    case 'lea-y1': return leaMS(a);
    case 'lea-y2': return scanne('p-carnet', 'Carnet de suivi des apprentissages · PS', iso(a - 1, 7, 2));
    case 'emma-y1': return emma4e();
    default: return VIDE;
  }
}
