/**
 * rendezVous — rendez-vous fixes hebdomadaires (lot 4c, CLAUDE.md § Agenda › Rendez-vous fixes, COMPONENTS §18.6).
 *
 * - « Piscine · tous les jeudis », avec sa liste « À prévoir » cochée SEMAINE PAR SEMAINE (semaine = son lundi).
 * - Jamais affiché un jour de vacances scolaires (utils/vacances, zone de l'école ; fonction passée en paramètre).
 * - « Ajouté par [prénom] » (« vous » pour soi) dans le foyer de l'auteur seulement ; hors foyer, rien (la base ne
 *   rend pas l'auteur, M43). Modifiable et supprimable par le foyer de l'auteur seulement (règle du 21 nov. 2026) :
 *   `peut_modifier` vient de la base (ligne d'auteur visible).
 * - Coche « À prévoir » partagée entre tous les responsables ; sous l'élément coché, « Coché par [prénom] · [heure] »
 *   dans le foyer de l'auteur seulement, « Fait » ailleurs (la base ne rend l'auteur qu'au foyer, M43).
 *
 * Module pur : aucun import (testé par node, src/utils/rendezVous.test.mts). Jours 'AAAA-MM-JJ' (heure de Paris).
 */

export interface RendezVous {
  id: string;
  child_id: string;
  titre: string;
  /** 1 = lundi … 7 = dimanche */
  jour_semaine: number;
  heure?: string | null;
  categorie?: string | null;
  a_prevoir: string[];
  /** Auteur (rendez_vous_auteurs) : seulement si la base me le rend (foyer de l'auteur), sinon null. */
  cree_par?: string | null;
  /** Je peux modifier et supprimer (foyer de l'auteur, ou auteur parti) : ligne d'auteur visible. */
  peut_modifier?: boolean;
}

export interface CocheLueRdv {
  rdv_id: string;
  semaine: string;
  item: string;
}

export interface AuteurCocheRdv extends CocheLueRdv {
  fait_par: string | null;
  fait_le: string | null;
}

const JOURS_PLURIEL = ['lundis', 'mardis', 'mercredis', 'jeudis', 'vendredis', 'samedis', 'dimanches'];
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** « Tous les jeudis » */
export function recurrence(jourSemaine: number): string {
  return `Tous les ${JOURS_PLURIEL[(jourSemaine - 1 + 7) % 7]}`;
}

/** « Piscine · tous les jeudis » */
export function libelleRendezVous(r: Pick<RendezVous, 'titre' | 'jour_semaine'>): string {
  return `${r.titre} · ${recurrence(r.jour_semaine).toLowerCase()}`;
}

/** « Ajouté par vous », « Ajouté par Marc », ou null (auteur inconnu : compte effacé, ancien responsable). */
export function ajoutePar(creePar: string | null | undefined, auteurs: Record<string, string>): string | null {
  if (!creePar || !auteurs[creePar]) return null;
  return `Ajouté par ${auteurs[creePar]}`;
}

/** Jour de la semaine `jourSemaine` dans la semaine qui commence le lundi `lundi`. */
export function jourDansSemaine(lundi: string, jourSemaine: number, decalerJour: (j: string, n: number) => string): string {
  return decalerJour(lundi, jourSemaine - 1);
}

/** Occurrences des rendez-vous dans la semaine du `lundi`, hors jours de vacances. */
export function occurrencesSemaine(
  rdvs: RendezVous[],
  lundi: string,
  enVacances: (jour: string) => boolean,
  decalerJour: (j: string, n: number) => string,
): { rdv: RendezVous; jour: string }[] {
  return rdvs
    .map((rdv) => ({ rdv, jour: jourDansSemaine(lundi, rdv.jour_semaine, decalerJour) }))
    .filter((o) => !enVacances(o.jour))
    .sort((a, b) => a.jour.localeCompare(b.jour) || (a.rdv.heure ?? '').localeCompare(b.rdv.heure ?? '') || a.rdv.titre.localeCompare(b.rdv.titre));
}

/** Liste « À prévoir » saisie en un texte (« Maillot, bonnet ; serviette ») → éléments, sans doublon ni vide. */
export function listeAPrevoir(texte: string): string[] {
  const vus = new Set<string>();
  const res: string[] = [];
  for (const brut of texte.split(/[,;\n]/)) {
    const item = brut.trim().replace(/\s+/g, ' ').slice(0, 60);
    const cle = item.toLowerCase();
    if (item && !vus.has(cle)) {
      vus.add(cle);
      res.push(item.charAt(0).toUpperCase() + item.slice(1));
    }
  }
  return res.slice(0, 12);
}

/**
 * État des éléments « À prévoir » d'un rendez-vous pour une semaine : coché ou non, et sa ligne source.
 * `ligne` : fonction de libellé (utils/devoirs.libelleCoche), passée en paramètre pour garder ce module pur.
 */
export function etatAPrevoir(
  rdv: Pick<RendezVous, 'id' | 'a_prevoir'>,
  semaine: string,
  coches: CocheLueRdv[],
  auteurs: AuteurCocheRdv[],
  nomAuteur: (faitPar: string | null) => string | null,
  jourDe: (iso: string) => string,
  heureDe: (iso: string) => string,
  ligne: (d: { fait: boolean; faitJour: string | null; faitHeure: string | null }, auteur: string | null) => string | null,
): { item: string; coche: boolean; source: string | null }[] {
  return rdv.a_prevoir.map((item) => {
    const coche = coches.some((c) => c.rdv_id === rdv.id && c.semaine === semaine && c.item === item);
    const a = coche ? auteurs.find((x) => x.rdv_id === rdv.id && x.semaine === semaine && x.item === item) : undefined;
    const source = ligne(
      { fait: coche, faitJour: a?.fait_le ? jourDe(a.fait_le) : null, faitHeure: a?.fait_le ? heureDe(a.fait_le) : null },
      a ? nomAuteur(a.fait_par) : null,
    );
    return { item, coche, source };
  });
}
