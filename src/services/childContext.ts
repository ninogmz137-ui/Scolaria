/**
 * Child context provider for Aria conversations.
 *
 * Builds a rich context string from the child's profile,
 * grades, activities, and emotional check-ins so that
 * Claude can give personalised, informed answers.
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

export interface JoyCheckIn {
  date: string;
  score: number; // 1-10
  energy?: number;
  stress?: number;
}

export interface ChildContext {
  profile: ChildProfile;
  grades: SubjectGrade[];
  activities: Activity[];
  recentJoy: JoyCheckIn[];
  upcomingEvents: string[];
}

// ─── Mock data (will be replaced by real data store) ─────

export const MOCK_CHILDREN: ChildContext[] = [
  {
    profile: {
      id: '1',
      scolariaId: 'SCA-2026-FR-048721',
      name: 'Lucas Moreau',
      age: 10,
      classe: 'CM2',
      school: 'École Voltaire',
      superPower: 'Curiosité',
    },
    grades: [
      {
        subject: 'Mathématiques',
        average: 15.5,
        classAvg: 12.3,
        trend: 'up',
        recentGrades: [
          { value: 17, maxValue: 20, date: '15 mars', type: 'Contrôle' },
          { value: 14, maxValue: 20, date: '8 mars', type: 'Devoir maison' },
          { value: 16, maxValue: 20, date: '1 mars', type: 'Contrôle' },
        ],
      },
      {
        subject: 'Français',
        average: 14.0,
        classAvg: 13.1,
        trend: 'stable',
        recentGrades: [
          { value: 15, maxValue: 20, date: '14 mars', type: 'Rédaction' },
          { value: 13, maxValue: 20, date: '7 mars', type: 'Dictée' },
        ],
      },
      {
        subject: 'Histoire-Géo',
        average: 16.0,
        classAvg: 11.8,
        trend: 'up',
        recentGrades: [
          { value: 18, maxValue: 20, date: '12 mars', type: 'Exposé' },
          { value: 15, maxValue: 20, date: '5 mars', type: 'Contrôle' },
        ],
      },
      {
        subject: 'Anglais',
        average: 17.0,
        classAvg: 13.7,
        trend: 'up',
        recentGrades: [
          { value: 18, maxValue: 20, date: '13 mars', type: 'Oral' },
          { value: 16, maxValue: 20, date: '6 mars', type: 'Contrôle' },
        ],
      },
      {
        subject: 'Sciences',
        average: 13.0,
        classAvg: 12.5,
        trend: 'down',
        recentGrades: [
          { value: 12, maxValue: 20, date: '11 mars', type: 'TP' },
          { value: 14, maxValue: 20, date: '4 mars', type: 'Contrôle' },
        ],
      },
      {
        subject: 'EPS',
        average: 15.0,
        classAvg: 14.2,
        trend: 'stable',
        recentGrades: [
          { value: 16, maxValue: 20, date: '10 mars', type: 'Course' },
        ],
      },
    ],
    activities: [
      { name: 'Judo', category: 'Sport', level: 'Ceinture verte' },
      { name: 'Piano', category: 'Musique', level: '3ème année' },
      { name: 'Robotique', category: 'Tech', level: 'Intermédiaire' },
    ],
    recentJoy: [
      { date: '20 mars', score: 8, energy: 7, stress: 3 },
      { date: '19 mars', score: 7, energy: 6, stress: 4 },
      { date: '18 mars', score: 9, energy: 8, stress: 2 },
      { date: '17 mars', score: 6, energy: 5, stress: 5 },
      { date: '16 mars', score: 8, energy: 7, stress: 3 },
    ],
    upcomingEvents: [
      'Contrôle de Maths — vendredi 20 mars (fractions et proportionnalité)',
      'Sortie au Musée d\'Orsay — samedi 21 mars',
      'Réunion parents — jeudi 19 mars 18h',
    ],
  },
  {
    profile: {
      id: '2',
      scolariaId: 'SCA-2026-FR-048722',
      name: 'Emma Moreau',
      age: 12,
      classe: '6ème',
      school: 'Collège Victor Hugo',
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
    ],
    recentJoy: [
      { date: '20 mars', score: 7, energy: 6, stress: 4 },
      { date: '19 mars', score: 8, energy: 7, stress: 3 },
    ],
    upcomingEvents: [
      'Contrôle d\'anglais — lundi 23 mars',
    ],
  },
];

// ─── Build context string for Claude system prompt ───────

export function buildChildContextString(child: ChildContext): string {
  const { profile, grades, activities, recentJoy, upcomingEvents } = child;

  const overallAvg = grades.reduce((s, g) => s + g.average, 0) / grades.length;
  const bestSubject = grades.reduce((best, g) => (g.average > best.average ? g : best));
  const weakestSubject = grades.reduce((worst, g) => (g.average < worst.average ? g : worst));

  const gradesStr = grades
    .map((g) => {
      const trendEmoji = g.trend === 'up' ? '📈' : g.trend === 'down' ? '📉' : '➡️';
      const recent = g.recentGrades.map((r) => `${r.value}/${r.maxValue} (${r.type}, ${r.date})`).join(', ');
      return `  - ${g.subject}: moyenne ${g.average}/20 (classe: ${g.classAvg}/20) ${trendEmoji}\n    Notes récentes: ${recent}`;
    })
    .join('\n');

  const activitiesStr = activities
    .map((a) => `  - ${a.name} (${a.category}) — niveau: ${a.level}`)
    .join('\n');

  const joyStr = recentJoy
    .map((j) => {
      let details = `Score: ${j.score}/10`;
      if (j.energy !== undefined) details += `, Énergie: ${j.energy}/10`;
      if (j.stress !== undefined) details += `, Stress: ${j.stress}/10`;
      return `  - ${j.date}: ${details}`;
    })
    .join('\n');

  const eventsStr = upcomingEvents.map((e) => `  - ${e}`).join('\n');

  return `
═══ PROFIL ENFANT ═══
Nom: ${profile.name}
Âge: ${profile.age} ans
Classe: ${profile.classe} — ${profile.school}
ID Scolaria: ${profile.scolariaId}
Super-pouvoir identifié: ${profile.superPower}

═══ RÉSULTATS SCOLAIRES ═══
Moyenne générale: ${overallAvg.toFixed(1)}/20
Meilleure matière: ${bestSubject.subject} (${bestSubject.average}/20)
Matière à renforcer: ${weakestSubject.subject} (${weakestSubject.average}/20)

Détail par matière:
${gradesStr}

═══ ACTIVITÉS EXTRA-SCOLAIRES ═══
${activitiesStr}

═══ BIEN-ÊTRE RÉCENT (Score de Joie) ═══
${joyStr}

═══ ÉVÉNEMENTS À VENIR ═══
${eventsStr}
`.trim();
}

// ─── Get active child context ───────────────────────────

export function getChildContext(childId: string = '1'): ChildContext {
  return MOCK_CHILDREN.find((c) => c.profile.id === childId) ?? MOCK_CHILDREN[0];
}
