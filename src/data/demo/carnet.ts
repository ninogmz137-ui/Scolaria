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

export interface DemoTodo {
  kind: TodoKind;
  title: string;
  deadline: string;
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

export interface DemoCarnet {
  todo: DemoTodo[];
  aujourdhui: DemoAujourdhui[];
  /** Collège / lycée uniquement. */
  notesRecentes: DemoNoteRecente[];
  /** Maternelle / primaire uniquement. */
  apprentissagesRecents: DemoApprentissage[];
  /** Phrase de la carte Aria de l'Accueil (prénom de l'enfant seulement). */
  aria: string;
}

const CARNETS: Record<string, DemoCarnet> = {
  'demo-lea': {
    todo: [{ kind: 'lire', title: 'Photo de classe', deadline: 'Avant vendredi' }],
    aujourdhui: [
      { id: 'lea-1', kind: 'event', title: 'Atelier peinture', meta: 'Classe de GS', time: '10h' },
      { id: 'lea-2', kind: 'message', title: 'Mot de Mme Laurent', meta: 'Sortie à la ferme', time: '16h30' },
    ],
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
    aria: 'Léa part à la ferme pédagogique jeudi : veux-tu la liste des choses à prévoir ?',
  },
  'demo-lucas': {
    todo: [
      { kind: 'signer', title: 'Sortie au musée', deadline: 'Avant jeudi' },
      { kind: 'justifier', title: 'Absence lundi', deadline: 'Sous 48h' },
    ],
    aujourdhui: [
      { id: 'lucas-1', kind: 'event', title: 'Piscine', meta: 'M. Garcia', time: '14h' },
      { id: 'lucas-2', kind: 'message', title: 'Réunion parents', meta: 'Mme Dupont', time: '17h30' },
    ],
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
    aria: 'Lucas a piscine cet après-midi : pense au sac de sport et au bonnet.',
  },
  'demo-emma': {
    todo: [{ kind: 'signer', title: 'Convention de stage', deadline: 'Avant lundi' }],
    aujourdhui: [
      { id: 'emma-1', kind: 'event', title: 'Contrôle de maths', meta: 'Salle 204 · M. Petit', time: '10h' },
      { id: 'emma-2', kind: 'message', title: 'Réunion parents-professeurs', meta: 'Mme Rousseau', time: '17h' },
    ],
    notesRecentes: [
      { subject: 'Mathématiques', grade: '16', scale: '20', date: 'hier' },
      { subject: 'Histoire-Géo', grade: '15', scale: '20', date: '22 sept.' },
      { subject: 'Français', grade: '13', scale: '20', date: '18 sept.' },
    ],
    apprentissagesRecents: [],
    aria: 'Emma a un contrôle de maths aujourd’hui : veux-tu un résumé du chapitre ?',
  },
};

/** Carnet de démo de l'enfant ; null pour tout autre enfant (compte réel). */
export function getDemoCarnet(childId: string | null | undefined): DemoCarnet | null {
  if (!childId) return null;
  return CARNETS[childId] ?? null;
}

/** Carnet vide : compte réel tant que ces données ne sont pas branchées sur la base. */
export const CARNET_VIDE: DemoCarnet = {
  todo: [],
  aujourdhui: [],
  notesRecentes: [],
  apprentissagesRecents: [],
  aria: '',
};
