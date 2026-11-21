/**
 * Suivi de démo (famille Moreau) — MODE DÉMO UNIQUEMENT. Source UNIQUE du Suivi et de l'Accueil
 * (« Derniers apprentissages ») : aucun autre fichier ne contient d'observation ni de compétence.
 *
 * Univers de démo (référence : aligner tout autre fichier démo sur ces valeurs) :
 *  - Léa   · GS (maternelle) · Maternelle Pasteur · Mme Laurent (maîtresse). Observations par
 *            domaine du programme 2026 : texte, date, source. AUCUN niveau, aucun compteur.
 *  - Lucas · CM2 B (cycle 3) · École Voltaire · Mme Dupont (maîtresse), M. Garcia (EPS).
 *            École en 3 niveaux (Non acquis · Partiellement acquis · Acquis), découpage en périodes ;
 *            compétences de la période en cours ; recopies d'évaluations papier par le parent
 *            (« Recopié par vous ») à l'échelle du document recopié.
 *  - Emma  · 3e B (collège) · Collège Hugo · Mme Rousseau (professeure principale), M. Petit (maths),
 *            Mme Lambert (français), M. Martin (SVT), Mme Bernard (anglais), M. Leclerc
 *            (physique-chimie), M. Durand (histoire-géo). Notes /20 (demo-grades.json), pas de
 *            compétences ici.
 *
 * Dates RELATIVES à aujourd'hui (il y a n jours), comme l'Agenda et les Messages de démo.
 */

import { DISCIPLINES_CYCLE_3, DOMAINES_CYCLE_1 } from '../referentiels';
import { periodeCourante, type Decoupage, type Echelle, type ElementSuivi } from '../../utils/competences';

function ilYa(jours: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Réglages de l'école de démo (équivalent de classes.decoupage / echelle_competences). */
export const REGLAGES_DEMO: Record<string, { decoupage: Decoupage; echelle: Echelle }> = {
  'demo-lea': { decoupage: 'periodes', echelle: 4 },
  'demo-lucas': { decoupage: 'periodes', echelle: 3 },
};

const [LANGAGE, ACTIVITES_PHYSIQUES, ACTIVITES_ARTISTIQUES, OUTILS_MATHS, TEMPS_ESPACE, MONDE] = DOMAINES_CYCLE_1;
const [FRANCAIS, MATHS, LANGUES, HISTOIRE_GEO, SCIENCES, , , , , EPS] = DISCIPLINES_CYCLE_3;

function suiviDemo(childId: string): ElementSuivi[] {
  if (childId === 'demo-lea') {
    const obs = (id: string, domaine: string, texte: string, jours: number): ElementSuivi => ({
      id, domaine, texte, date: ilYa(jours), source: 'ecole', auteur: 'Mme Laurent',
    });
    return [
      obs('lea-o1', LANGAGE, 'Raconte une histoire entendue en respectant l’ordre des événements.', 7),
      obs('lea-o2', ACTIVITES_PHYSIQUES, 'Se déplace avec aisance sur un parcours d’obstacles.', 10),
      obs('lea-o3', ACTIVITES_ARTISTIQUES, 'Mélange les couleurs pour peindre un paysage d’automne.', 3),
      obs('lea-o4', OUTILS_MATHS, 'Dénombre une collection jusqu’à 10.', 9),
      obs('lea-o5', TEMPS_ESPACE, 'Range les jours de la semaine dans l’ordre.', 5),
      obs('lea-o6', MONDE, 'Observe et nomme les parties d’une plante.', 12),
    ];
  }
  if (childId === 'demo-lucas') {
    const p = periodeCourante(REGLAGES_DEMO['demo-lucas'].decoupage);
    const ecole = (id: string, domaine: string, texte: string, niveau: number, jours: number, auteur = 'Mme Dupont'): ElementSuivi => ({
      id, domaine, texte, niveau, echelle: 3, periode: p, date: ilYa(jours), source: 'ecole', auteur,
    });
    return [
      ecole('lucas-c1', FRANCAIS, 'Lire et comprendre un texte littéraire', 3, 6),
      ecole('lucas-c2', FRANCAIS, 'Écrire un texte cohérent d’une dizaine de lignes', 2, 9),
      ecole('lucas-c3', MATHS, 'Résoudre des problèmes avec des fractions simples', 3, 6),
      ecole('lucas-c4', MATHS, 'Calculer avec les nombres décimaux', 2, 10),
      ecole('lucas-c5', LANGUES, 'Comprendre des mots familiers à l’oral', 3, 14),
      ecole('lucas-c6', HISTOIRE_GEO, 'Situer des faits dans le temps', 2, 7),
      ecole('lucas-c7', SCIENCES, 'Mener une démarche d’investigation', 3, 8),
      ecole('lucas-c8', EPS, 'Courir longtemps à allure régulière', 2, 3, 'M. Garcia'),
      // Recopies d'évaluations papier par le parent, à l'échelle du document recopié.
      { id: 'lucas-r1', domaine: MATHS, texte: 'Tables de multiplication (évaluation papier)', niveau: 3, echelle: 4, periode: p, date: ilYa(4), source: 'parent' },
      { id: 'lucas-r2', domaine: FRANCAIS, texte: 'Dictée de mots (évaluation papier)', niveau: 2, echelle: 3, periode: p, date: ilYa(11), source: 'parent' },
    ];
  }
  return [];
}

/** Suivi de démo de l'enfant, du plus récent au plus ancien ; [] pour tout autre enfant. */
export function getSuiviDemo(childId: string | null | undefined): ElementSuivi[] {
  if (!childId) return [];
  return suiviDemo(childId).sort((a, b) => b.date.localeCompare(a.date));
}
