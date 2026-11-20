/**
 * Niveaux scolaires (PS → Terminale) et cycle correspondant.
 * Le cycle décide du contenu : maternelle (domaines), primaire (compétences 4 niveaux),
 * collège / lycée (notes /20).
 */

// La liste fermée des niveaux et sa normalisation vivent dans le module partagé avec l'Edge Function « aria »
// (une seule source : le serveur ne transmet au modèle qu'un niveau de cette liste).
import { NIVEAUX_PAR_CYCLE, normaliserNiveau, type Cycle } from '../../supabase/functions/_shared/niveaux';

export { NIVEAUX_PAR_CYCLE, normaliserNiveau, type Cycle };

export function cycleDuNiveau(niveau: string | null | undefined): Cycle | null {
  const n = normaliserNiveau(niveau);
  if (!n) return null;
  return NIVEAUX_PAR_CYCLE.find((c) => c.items.includes(n))?.cycle ?? null;
}

const LIBELLE_SECTION: Record<string, string> = { PS: 'Petite section', MS: 'Moyenne section', GS: 'Grande section' };

/** Classe lisible de l'en-tête du carnet : « GS » → « Grande section » ; les autres gardent leur forme (« CE1 », « 3ème »). */
export function libelleClasse(niveau: string | null | undefined): string {
  const n = normaliserNiveau(niveau);
  if (!n) return '';
  return LIBELLE_SECTION[n] ?? n;
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
