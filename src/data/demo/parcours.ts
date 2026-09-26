/**
 * Parcours de démo (famille Moreau) — MODE DÉMO UNIQUEMENT. Source UNIQUE des années de démo
 * (bouton année de Suivi, Mon parcours, année archivée). Univers : voir l'en-tête de suivi.ts.
 *
 * Millésimes RELATIFS à la rentrée en cours (a = année de la rentrée) : l'année en cours est toujours
 * a–(a+1), les archives a-1, a-2…
 *  - Léa   : GS (Maternelle Pasteur) ; MS archivée (Pasteur) ; PS recopiée par la famille.
 *  - Lucas : CM2 (École Voltaire, 3 niveaux, périodes) ; CM1 archivée dans une AUTRE école
 *            (École Condorcet : 4 niveaux LSU, semestres) — le carnet suit l'enfant ; CE2 recopiée.
 *  - Emma  : 3e (Collège Hugo) ; 4e et 5e archivées (Hugo) ; 6e et CM2 (École Voltaire) recopiées.
 */

import type { Decoupage, Echelle } from '../../utils/competences';

export interface AnneeParcours {
  id: string;
  /** « 2026-2027 » (format de la base). */
  annee: string;
  niveau: string;
  etablissement: string;
  statut: 'active' | 'archivée' | 'importée';
  /** Réglages de l'école cette année-là (maternelle / primaire). */
  decoupage?: Decoupage;
  echelle?: Echelle;
}

export function anneeRentree(jour = new Date()): number {
  return jour.getMonth() >= 8 ? jour.getFullYear() : jour.getFullYear() - 1;
}

export function millesime(a: number): string {
  return `${a}-${a + 1}`;
}

/** « 2026-2027 » → « 2026–2027 » (tiret demi-cadratin, COMPONENTS §17). */
export function millesimeAffiche(annee: string): string {
  return annee.replace('-', '–');
}

const ANNEES: Record<string, (a: number) => AnneeParcours[]> = {
  'demo-lea': (a) => [
    { id: 'lea-y0', annee: millesime(a), niveau: 'GS', etablissement: 'Maternelle Pasteur', statut: 'active' },
    { id: 'lea-y1', annee: millesime(a - 1), niveau: 'MS', etablissement: 'Maternelle Pasteur', statut: 'archivée' },
    { id: 'lea-y2', annee: millesime(a - 2), niveau: 'PS', etablissement: 'Maternelle Pasteur', statut: 'importée' },
  ],
  'demo-lucas': (a) => [
    { id: 'lucas-y0', annee: millesime(a), niveau: 'CM2', etablissement: 'École Voltaire', statut: 'active', decoupage: 'periodes', echelle: 3 },
    { id: 'lucas-y1', annee: millesime(a - 1), niveau: 'CM1', etablissement: 'École Condorcet', statut: 'archivée', decoupage: 'semestres', echelle: 4 },
    { id: 'lucas-y2', annee: millesime(a - 2), niveau: 'CE2', etablissement: 'École Condorcet', statut: 'importée' },
  ],
  'demo-emma': (a) => [
    { id: 'emma-y0', annee: millesime(a), niveau: '3ème', etablissement: 'Collège Hugo', statut: 'active' },
    { id: 'emma-y1', annee: millesime(a - 1), niveau: '4ème', etablissement: 'Collège Hugo', statut: 'archivée' },
    { id: 'emma-y2', annee: millesime(a - 2), niveau: '5ème', etablissement: 'Collège Hugo', statut: 'archivée' },
    { id: 'emma-y3', annee: millesime(a - 3), niveau: '6ème', etablissement: 'Collège Hugo', statut: 'importée' },
    { id: 'emma-y4', annee: millesime(a - 4), niveau: 'CM2', etablissement: 'École Voltaire', statut: 'importée' },
  ],
};

/** Années de l'enfant de démo, la plus récente d'abord (vide pour tout autre enfant). */
export function getAnneesDemo(childId: string | undefined, jour = new Date()): AnneeParcours[] {
  const f = childId ? ANNEES[childId] : undefined;
  return f ? f(anneeRentree(jour)) : [];
}
