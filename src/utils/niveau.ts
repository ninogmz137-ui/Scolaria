/**
 * Niveaux scolaires (PS → Terminale) et cycle correspondant.
 * Le cycle décide du contenu : maternelle (domaines), primaire (compétences 4 niveaux),
 * collège / lycée (notes /20).
 */

export type Cycle = 'maternelle' | 'primaire' | 'college' | 'lycee';

export const NIVEAUX_PAR_CYCLE: { cycle: Cycle; section: string; items: string[] }[] = [
  { cycle: 'maternelle', section: 'Maternelle', items: ['PS', 'MS', 'GS'] },
  { cycle: 'primaire', section: 'Élémentaire', items: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { cycle: 'college', section: 'Collège', items: ['6ème', '5ème', '4ème', '3ème'] },
  { cycle: 'lycee', section: 'Lycée', items: ['2nde', '1ère', 'Terminale'] },
];

const ALIAS: Record<string, string> = {
  'petite section': 'PS',
  'moyenne section': 'MS',
  'grande section': 'GS',
  '6e': '6ème',
  '5e': '5ème',
  '4e': '4ème',
  '3e': '3ème',
  seconde: '2nde',
  première: '1ère',
  premiere: '1ère',
  '1re': '1ère',
  term: 'Terminale',
  terminale: 'Terminale',
};

/** Niveau normalisé (« Grande section » → « GS », « 3e » → « 3ème »), ou null si inconnu. */
export function normaliserNiveau(texte: string | null | undefined): string | null {
  if (!texte) return null;
  const brut = texte.split('—')[0].trim();
  const bas = brut.toLowerCase();
  if (ALIAS[bas]) return ALIAS[bas];
  for (const { items } of NIVEAUX_PAR_CYCLE) {
    const trouve = items.find((n) => n.toLowerCase() === bas);
    if (trouve) return trouve;
  }
  return null;
}

export function cycleDuNiveau(niveau: string | null | undefined): Cycle | null {
  const n = normaliserNiveau(niveau);
  if (!n) return null;
  return NIVEAUX_PAR_CYCLE.find((c) => c.items.includes(n))?.cycle ?? null;
}

/** Collège ou lycée : notes /20. Maternelle et primaire : pas de notes. */
export function aDesNotes(cycle: Cycle | null | undefined): boolean {
  return cycle === 'college' || cycle === 'lycee';
}

/** Devoirs : dès le CP (primaire, collège, lycée). Jamais en maternelle. */
export function aDesDevoirs(cycle: Cycle | null | undefined): boolean {
  return cycle === 'primaire' || aDesNotes(cycle);
}

/** Emploi du temps : dès le CP (en primaire, journée type identique chaque semaine). */
export function aUnEmploiDuTemps(cycle: Cycle | null | undefined): boolean {
  return cycle === 'primaire' || aDesNotes(cycle);
}
