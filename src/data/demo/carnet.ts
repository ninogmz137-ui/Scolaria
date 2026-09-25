/**
 * Carnet de démo par enfant (famille Moreau) — MODE DÉMO UNIQUEMENT.
 *
 * Référence unique de l'univers de démo (aligner tout autre fichier démo sur ces valeurs) :
 *  - Léa   · GS (maternelle) · Maternelle Pasteur · Mme Laurent (maîtresse), Mme Petit (ATSEM),
 *            M. Renaud (directeur). Pas de notes : domaines + observations.
 *  - Lucas · CM2 B (primaire) · École Voltaire · Mme Dupont (maîtresse), M. Garcia (EPS),
 *            M. Faure (directeur). Pas de notes /20 : compétences sur 4 niveaux (livret).
 *  - Emma  · 3e B (collège) · Collège Hugo · Mme Rousseau (professeure principale), M. Petit (maths),
 *            Mme Lambert (français), M. Martin (SVT), Mme Bernard (anglais), M. Leclerc
 *            (physique-chimie), M. Durand (histoire-géo). Notes /20, emploi du temps, devoirs.
 *
 * Un compte réel n'utilise JAMAIS ce fichier.
 */

export type TodoKind = 'signer' | 'lire' | 'justifier';

/** Document à signer (démo) : ce que SignDoc affiche. */
export interface DemoDoc {
  title: string;
  date?: string;
  lieu?: string;
  montant?: string;
  deadline?: string;
  aria?: string;
}

export interface DemoTodo {
  kind: TodoKind;
  title: string;
  deadline: string;
  doc?: DemoDoc;
}

export interface DemoAujourdhui {
  id: string;
  kind: 'event' | 'message';
  title: string;
  meta: string;
  time: string;
}

export interface DemoNoteRecente {
  subject: string;
  grade: string;
  scale: string;
  date: string;
}

/** Niveaux de compétence (primaire) : 1 Non atteint · 2 Partiellement atteint · 3 Atteint · 4 Dépassé. */
export type NiveauCompetence = 1 | 2 | 3 | 4;

export const NIVEAUX_COMPETENCE: Record<NiveauCompetence, string> = {
  1: 'Non atteint',
  2: 'Partiellement atteint',
  3: 'Atteint',
  4: 'Dépassé',
};

export interface DemoApprentissage {
  /** Domaine (maternelle) ou matière (primaire). */
  domaine: string;
  /** Observation (maternelle) ou compétence (primaire). */
  texte: string;
  /** Primaire uniquement. */
  niveau?: NiveauCompetence;
  date: string;
  source: string;
}

/**
 * « À faire », « Aujourd'hui » et la carte Aria de l'Accueil ne sont PAS ici : ils sont construits
 * à partir de l'Agenda, des mots et des Messages de l'enfant (src/data/demo/accueil.ts).
 */
export interface DemoCarnet {
  /** Collège / lycée uniquement. */
  notesRecentes: DemoNoteRecente[];
  /** Maternelle / primaire uniquement. */
  apprentissagesRecents: DemoApprentissage[];
}

const CARNETS: Record<string, DemoCarnet> = {
  'demo-lea': {
    notesRecentes: [],
    apprentissagesRecents: [
      {
        domaine: 'Mobiliser le langage',
        texte: 'Raconte une histoire entendue en respectant l’ordre des événements.',
        date: '18 sept.',
        source: 'Mme Laurent',
      },
      {
        domaine: 'Structurer sa pensée',
        texte: 'Dénombre une collection jusqu’à 10.',
        date: '15 sept.',
        source: 'Mme Laurent',
      },
    ],
  },
  'demo-lucas': {
    notesRecentes: [],
    apprentissagesRecents: [
      {
        domaine: 'Mathématiques',
        texte: 'Résoudre des problèmes avec des fractions simples',
        niveau: 3,
        date: '19 sept.',
        source: 'Mme Dupont',
      },
      {
        domaine: 'Français',
        texte: 'Écrire un texte cohérent d’une dizaine de lignes',
        niveau: 2,
        date: '16 sept.',
        source: 'Mme Dupont',
      },
    ],
  },
  'demo-emma': {
    notesRecentes: [
      { subject: 'Mathématiques', grade: '16', scale: '20', date: 'hier' },
      { subject: 'Histoire-Géo', grade: '15', scale: '20', date: '22 sept.' },
      { subject: 'Français', grade: '13', scale: '20', date: '18 sept.' },
    ],
    apprentissagesRecents: [],
  },
};

/**
 * Compétences du livret (primaire) — démo : Lucas, CM2 B, saisies par Mme Dupont.
 * Intitulés rédigés pour la démo, dans l'esprit du LSU (à reprendre des textes officiels en B3).
 */
const COMPETENCES_DEMO: Record<string, DemoApprentissage[]> = {
  'demo-lucas': [
    { domaine: 'Français', texte: 'Lire et comprendre un texte littéraire', niveau: 3, date: '19 sept.', source: 'Mme Dupont' },
    { domaine: 'Français', texte: 'Écrire un texte cohérent d’une dizaine de lignes', niveau: 2, date: '16 sept.', source: 'Mme Dupont' },
    { domaine: 'Français', texte: 'Orthographier les mots les plus fréquents', niveau: 3, date: '12 sept.', source: 'Mme Dupont' },
    { domaine: 'Mathématiques', texte: 'Résoudre des problèmes avec des fractions simples', niveau: 3, date: '19 sept.', source: 'Mme Dupont' },
    { domaine: 'Mathématiques', texte: 'Calculer avec les nombres décimaux', niveau: 2, date: '15 sept.', source: 'Mme Dupont' },
    { domaine: 'Mathématiques', texte: 'Reconnaître et tracer des figures géométriques', niveau: 4, date: '10 sept.', source: 'Mme Dupont' },
    { domaine: 'Sciences et technologie', texte: 'Mener une démarche d’investigation', niveau: 3, date: '17 sept.', source: 'Mme Dupont' },
    { domaine: 'Histoire-géographie', texte: 'Situer des faits dans le temps', niveau: 2, date: '18 sept.', source: 'Mme Dupont' },
    { domaine: 'Langues vivantes (anglais)', texte: 'Comprendre des mots familiers à l’oral', niveau: 4, date: '11 sept.', source: 'Mme Dupont' },
    { domaine: 'Éducation physique et sportive', texte: 'Nager sur une distance de 25 m', niveau: 1, date: '22 sept.', source: 'M. Garcia' },
  ],
};

/** Compétences de démo (primaire) de l'enfant ; [] pour tout autre enfant. */
export function getDemoCompetences(childId: string | null | undefined): DemoApprentissage[] {
  if (!childId) return [];
  return COMPETENCES_DEMO[childId] ?? [];
}

/** Carnet de démo de l'enfant ; null pour tout autre enfant (compte réel). */
export function getDemoCarnet(childId: string | null | undefined): DemoCarnet | null {
  if (!childId) return null;
  return CARNETS[childId] ?? null;
}

/** Carnet vide : compte réel tant que ces données ne sont pas branchées sur la base. */
export const CARNET_VIDE: DemoCarnet = {
  notesRecentes: [],
  apprentissagesRecents: [],
};
