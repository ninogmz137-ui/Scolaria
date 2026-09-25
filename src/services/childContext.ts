/**
 * Données de démo des enfants pour les réponses d'exemple d'Aria (mode démo, local).
 * Rien de ce fichier n'est envoyé au modèle : en compte réel, seuls prénom + niveau partent
 * (ariaApi.ts).
 */

// ─── Types ────────────────────────────────────────────────

export interface ChildProfile {
  id: string;
  scolariaId: string;
  name: string;
  age: number;
  classe: string;
  school: string;
  superPower: string;
}

export interface SubjectGrade {
  subject: string;
  average: number;
  classAvg: number;
  trend: 'up' | 'down' | 'stable';
  recentGrades: { value: number; maxValue: number; date: string; type: string }[];
}

export interface Activity {
  name: string;
  category: string;
  level: string;
}

export interface ChildContext {
  profile: ChildProfile;
  grades: SubjectGrade[];
  activities: Activity[];
  upcomingEvents: string[];
}

// ─── Mock data (will be replaced by real data store) ─────

export const MOCK_CHILDREN: ChildContext[] = [
  // ── Léa (id 'demo-lea') — Maternelle ──
  {
    profile: {
      id: 'demo-lea',
      scolariaId: 'SCA-2026-FR-048720',
      name: 'Léa Moreau',
      age: 4,
      classe: 'Grande section',
      school: 'Maternelle Pasteur',
      superPower: 'Créativité',
    },
    grades: [],
    activities: [
      { name: 'Éveil musical', category: 'Musique', level: '1ère année' },
      { name: 'Bébé nageur', category: 'Sport', level: 'Étoile de mer' },
      { name: 'Peinture', category: 'Art', level: 'Découverte' },
    ],
    upcomingEvents: [
      'Atelier peinture — vendredi 28 mars 10h',
      'Sortie au parc — lundi 31 mars',
    ],
  },
  // ── Lucas (id 'demo-lucas') — Primaire ──
  {
    profile: {
      id: 'demo-lucas',
      scolariaId: 'SCA-2026-FR-048721',
      name: 'Lucas Moreau',
      age: 10,
      classe: 'CM2',
      school: 'École Voltaire',
      superPower: 'Curiosité',
    },
    // Primaire : pas de notes /20 (compétences du livret, cf. carnet.ts).
    grades: [],
    activities: [
      { name: 'Judo', category: 'Sport', level: 'Ceinture verte' },
      { name: 'Piano', category: 'Musique', level: '3ème année' },
      { name: 'Robotique', category: 'Tech', level: 'Intermédiaire' },
    ],
    upcomingEvents: [
      'Contrôle de Maths — vendredi 28 mars (fractions et proportionnalité)',
      'Sortie au Musée d\'Orsay — samedi 29 mars',
      'Réunion parents — jeudi 3 avril 18h',
    ],
  },
  // ── Emma (id 'demo-emma') — Collège ──
  {
    profile: {
      id: 'demo-emma',
      scolariaId: 'SCA-2026-FR-048722',
      name: 'Emma Moreau',
      age: 13,
      classe: '3ème',
      school: 'Collège Hugo',
      superPower: 'Créativité',
    },
    grades: [
      {
        subject: 'Mathématiques',
        average: 13.5,
        classAvg: 12.0,
        trend: 'stable',
        recentGrades: [
          { value: 14, maxValue: 20, date: '14 mars', type: 'Contrôle' },
          { value: 13, maxValue: 20, date: '7 mars', type: 'Devoir' },
        ],
      },
      {
        subject: 'Français',
        average: 16.5,
        classAvg: 13.0,
        trend: 'up',
        recentGrades: [
          { value: 17, maxValue: 20, date: '13 mars', type: 'Rédaction' },
          { value: 16, maxValue: 20, date: '6 mars', type: 'Commentaire' },
        ],
      },
      {
        subject: 'Anglais',
        average: 15.0,
        classAvg: 12.5,
        trend: 'up',
        recentGrades: [
          { value: 16, maxValue: 20, date: '12 mars', type: 'Oral' },
          { value: 14, maxValue: 20, date: '5 mars', type: 'Contrôle' },
        ],
      },
    ],
    activities: [
      { name: 'Dessin', category: 'Art', level: 'Avancé' },
      { name: 'Danse', category: 'Sport', level: '4ème année' },
      { name: 'Écriture créative', category: 'Littérature', level: 'Club ado' },
    ],
    upcomingEvents: [
      'Contrôle d\'anglais — lundi 31 mars',
      'Brevet blanc — 14-15 avril',
    ],
  },
];

// ─── Get active child context ───────────────────────────

/**
 * Contexte de démo d'un enfant de DÉMO (id exact). Aucun repli : un id inconnu (enfant réel)
 * renvoie null. L'ancien repli par prénom puis sur Léa envoyait des données de démo à Aria
 * pour de vrais enfants (un « Emma » réel recevait les notes de l'Emma de démo).
 */
export function getChildContext(childId: string): ChildContext | null {
  const byId = MOCK_CHILDREN.find((c) => c.profile.id === childId);
  if (byId) return byId;

  return null;
}
