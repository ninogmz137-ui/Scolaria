/**
 * devoirs — règles de la vue « Devoirs » de l'Agenda (lot 4a, CLAUDE.md § Agenda › Devoirs, COMPONENTS §18.6).
 *
 * - Devoirs groupés par JOUR D'ÉCHÉANCE : « Pour demain » en premier, puis les jours suivants dans l'ordre ;
 *   les devoirs pour aujourd'hui ferment la liste (déjà rendus ou à rendre ce matin) ; les jours passés
 *   n'apparaissent pas.
 * - Ligne source sous un devoir coché : « Coché par [prénom] · [heure] » (« Coché par vous » pour soi).
 *
 * Module pur : aucun import (testé par node, src/utils/devoirs.test.mts). Les jours sont des chaînes
 * 'AAAA-MM-JJ' en heure de Paris (utils/jourParis), calculées par l'appelant.
 */

export interface Devoir {
  id: string;
  titre: string;
  matiere?: string;
  /** Jour d'échéance, heure de Paris. */
  jour: string;
  fait: boolean;
  /** Responsable qui a coché (agenda_events.fait_par) ; null : inconnu ou compte effacé. */
  faitPar?: string | null;
  /** Jour et heure de Paris de la coche ('AAAA-MM-JJ', 'HH:MM'), calculés par l'appelant. */
  faitJour?: string | null;
  faitHeure?: string | null;
}

export interface GroupeDevoirs {
  jour: string;
  titre: string;
  devoirs: Devoir[];
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function partiesJour(jour: string): { semaine: number; date: number; mois: number } {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return { semaine: d.getUTCDay(), date: j, mois: m - 1 };
}

/** « jeudi 26 nov. » */
export function jourEnClair(jour: string): string {
  const p = partiesJour(jour);
  return `${JOURS[p.semaine]} ${p.date === 1 ? '1er' : p.date} ${MOIS[p.mois]}`;
}

/** « Pour demain », « Pour aujourd’hui », « Pour jeudi 26 nov. » */
export function titreEcheance(jour: string, aujourdhui: string, demain: string): string {
  if (jour === demain) return 'Pour demain';
  if (jour === aujourdhui) return 'Pour aujourd’hui';
  return `Pour ${jourEnClair(jour)}`;
}

/** Groupes de la vue « Devoirs » : demain, puis les jours suivants, puis aujourd'hui ; passé exclu. */
export function grouperDevoirs(devoirs: Devoir[], aujourdhui: string, demain: string): GroupeDevoirs[] {
  const parJour = new Map<string, Devoir[]>();
  for (const d of devoirs) {
    if (d.jour < aujourdhui) continue;
    const liste = parJour.get(d.jour) ?? [];
    liste.push(d);
    parJour.set(d.jour, liste);
  }
  const rang = (jour: string) => (jour === aujourdhui ? 1 : 0);
  return [...parJour.keys()]
    .sort((a, b) => rang(a) - rang(b) || a.localeCompare(b))
    .map((jour) => ({
      jour,
      titre: titreEcheance(jour, aujourdhui, demain),
      devoirs: (parJour.get(jour) ?? []).slice().sort((a, b) => Number(a.fait) - Number(b.fait) || a.titre.localeCompare(b.titre)),
    }));
}

/** « 18:05 » → « 18h05 », « 08:00 » → « 8h ». */
function heureEnClair(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

/**
 * Ligne source d'un devoir, ou null s'il n'est pas coché.
 * `auteur` : 'vous' pour le responsable connecté, le prénom d'un responsable du même foyer, ou null.
 * Règle des parents séparés (20 nov. 2026) : hors du foyer de l'auteur, la base ne rend ni l'auteur ni l'heure
 * → « Fait » seulement (de même si l'heure est inconnue : base sans M41, compte de l'auteur effacé).
 */
export function libelleCoche(
  d: Pick<Devoir, 'fait' | 'faitJour' | 'faitHeure'>,
  auteur: string | null,
  aujourdhui: string,
  hier: string,
): string | null {
  if (!d.fait) return null;
  if (!d.faitJour || !d.faitHeure) return 'Fait';
  const qui = auteur ? `Coché par ${auteur}` : 'Coché';
  const heure = heureEnClair(d.faitHeure);
  if (d.faitJour === aujourdhui) return `${qui} · ${heure}`;
  if (d.faitJour === hier) return `${qui} · hier, ${heure}`;
  const p = partiesJour(d.faitJour);
  return `${qui} · ${p.date === 1 ? '1er' : p.date} ${MOIS[p.mois]}, ${heure}`;
}

// ─── Construction des devoirs à partir de la base (une seule logique pour l'Accueil, l'Agenda et les tests) ───

/** Ligne de agenda_events lue par l'app. */
export interface LigneDevoir {
  id: string;
  title?: string | null;
  subject?: string | null;
  start_time: string;
  is_done?: boolean | null;
}

/** Ligne de agenda_coches (M41) : rendue par la base seulement dans le foyer de l'auteur (sinon absente → « Fait »). */
export interface CocheLue {
  event_id: string;
  fait_par: string | null;
  fait_le: string | null;
}

/** Ligne de responsables_enfant (M2f). */
export interface ResponsableLu {
  user_id: string;
  prenom?: string | null;
  est_moi?: boolean | null;
}

/** Prénom affiché de chaque responsable de l'enfant, par compte ; « vous » pour le compte connecté. */
export type AuteursCoche = Record<string, string>;

export function auteursDepuisResponsables(lignes: ResponsableLu[]): AuteursCoche {
  const auteurs: AuteursCoche = {};
  for (const r of lignes) auteurs[String(r.user_id)] = r.est_moi ? 'vous' : String(r.prenom ?? '').trim();
  return auteurs;
}

/** Nom affiché de l'auteur d'une coche, ou null s'il est inconnu (hors foyer, compte effacé, base sans M41). */
export function auteurCoche(faitPar: string | null | undefined, auteurs: AuteursCoche): string | null {
  if (!faitPar) return null;
  return auteurs[faitPar] || null;
}

/**
 * Devoirs de l'app à partir des lignes de agenda_events et des coches lues dans agenda_coches (RLS).
 * `jourDe` / `heureDe` : jour 'AAAA-MM-JJ' et heure 'HH:MM' de Paris d'un horodatage ISO de la base
 * (utils/jourParis), passés en paramètre pour garder ce module pur.
 */
export function construireDevoirs(
  lignes: LigneDevoir[],
  coches: CocheLue[],
  jourDe: (iso: string) => string,
  heureDe: (iso: string) => string,
): Devoir[] {
  const parEvenement = new Map(coches.map((c) => [String(c.event_id), c]));
  return lignes.map((r) => {
    const fait = !!r.is_done;
    const c = fait ? parEvenement.get(String(r.id)) : undefined;
    return {
      id: String(r.id),
      titre: String(r.title ?? ''),
      matiere: r.subject ? String(r.subject) : undefined,
      jour: jourDe(r.start_time),
      fait,
      faitPar: c?.fait_par ?? null,
      faitJour: c?.fait_le ? jourDe(c.fait_le) : null,
      faitHeure: c?.fait_le ? heureDe(c.fait_le) : null,
    };
  });
}

/**
 * Ligne source (« Coché par vous · 15h53 », « Fait », ou null) de chaque devoir d'une liste de lignes de la base.
 * UNE seule fonction pour l'Accueil, la vue par jour de l'Agenda et sa vue « Devoirs » (défaut du 20 nov. :
 * la vue par jour n'affichait pas la ligne). Les lignes qui ne sont pas des devoirs sont ignorées.
 */
export function lignesSourceDevoirs(
  lignes: (LigneDevoir & { event_type?: string | null })[],
  coches: CocheLue[],
  auteurs: AuteursCoche,
  jourDe: (iso: string) => string,
  heureDe: (iso: string) => string,
  aujourdhui: string,
  hier: string,
): Map<string, string | null> {
  const devoirs = construireDevoirs(lignes.filter((r) => r.event_type === 'devoir'), coches, jourDe, heureDe);
  return new Map(devoirs.map((d) => [d.id, libelleCoche(d, auteurCoche(d.faitPar, auteurs), aujourdhui, hier)]));
}

/** Nombre de devoirs restant à faire (non cochés, aujourd'hui et après). */
export function resteAFaire(groupes: GroupeDevoirs[]): number {
  return groupes.reduce((n, g) => n + g.devoirs.filter((d) => !d.fait).length, 0);
}
