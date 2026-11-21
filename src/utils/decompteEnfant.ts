/**
 * Décompte d'un carnet pour la pastille de l'avatar et le sélecteur d'enfant (lot 5 ; CLAUDE.md § Principe fondateur).
 * La pastille s'allume pour : mot à traiter, message non lu, devoir pour demain non coché. Une photo ou une
 * compétence ajoutée ne l'allume pas (elles n'entrent pas ici).
 * Texte en clair : « 1 mot à signer · 2 nouveautés », ou « À jour ».
 * Module pur, testé par node (`npm run test:decompte-enfant`) : aucun import.
 */

export interface EntreeDecompte {
  /** Mots qui attendent une action de MOI (signature, réponse). */
  motsATraiter: number;
  /** Parmi eux, ceux qui n'attendent QUE une signature (libellé « à signer »). */
  motsASignerSeulement: number;
  /** Messages non lus (fils) et mots non lus qui n'attendent aucune action. */
  nonLus: number;
  /** Devoirs pour demain (heure de Paris) non cochés. */
  devoirsDemain: number;
}

export interface Decompte {
  aTraiter: number;
  nouveautes: number;
  pastille: boolean;
  texte: string;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function decompter(e: EntreeDecompte): Decompte {
  const aTraiter = Math.max(0, e.motsATraiter);
  const nouveautes = Math.max(0, e.nonLus) + Math.max(0, e.devoirsDemain);
  const parties: string[] = [];
  if (aTraiter > 0) {
    parties.push(`${pluriel(aTraiter, 'mot')} ${e.motsASignerSeulement === aTraiter ? 'à signer' : 'à traiter'}`);
  }
  if (nouveautes > 0) parties.push(pluriel(nouveautes, 'nouveauté'));
  return { aTraiter, nouveautes, pastille: parties.length > 0, texte: parties.length ? parties.join(' · ') : 'À jour' };
}

/** Devoirs dus demain et non cochés. */
export function devoirsDemainNonCoches(devoirs: { jour: string; fait: boolean }[], demain: string): number {
  return devoirs.filter((d) => d.jour === demain && !d.fait).length;
}

/** La pastille de l'avatar : un AUTRE enfant que celui affiché a du nouveau. */
export function pastilleAutresEnfants(decomptes: Map<string, Decompte>, enfantAffiche: string | null | undefined): boolean {
  for (const [id, d] of decomptes) if (id !== enfantAffiche && d.pastille) return true;
  return false;
}
