/**
 * Niveaux scolaires (PS → Terminale) — liste FERMÉE, partagée par l'application (src/utils/niveau.ts) et par
 * l'Edge Function « aria ». Module sans dépendance.
 *
 * Côté serveur, cette liste sert de filtre : `children.classe` est un texte libre ; seul un niveau reconnu ici
 * part au modèle (minimisation : prénom + niveau, rien d'autre).
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
