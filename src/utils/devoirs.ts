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
 * Ligne source d'un devoir coché, ou null s'il n'est pas coché ou si l'heure est inconnue (base sans M41).
 * `auteur` : 'vous' pour le responsable connecté, le prénom de l'autre responsable, ou null (inconnu).
 */
export function libelleCoche(
  d: Pick<Devoir, 'fait' | 'faitJour' | 'faitHeure'>,
  auteur: string | null,
  aujourdhui: string,
  hier: string,
): string | null {
  if (!d.fait || !d.faitJour || !d.faitHeure) return null;
  const qui = auteur ? `Coché par ${auteur}` : 'Coché';
  const heure = heureEnClair(d.faitHeure);
  if (d.faitJour === aujourdhui) return `${qui} · ${heure}`;
  if (d.faitJour === hier) return `${qui} · hier, ${heure}`;
  const p = partiesJour(d.faitJour);
  return `${qui} · ${p.date === 1 ? '1er' : p.date} ${MOIS[p.mois]}, ${heure}`;
}

/** Nombre de devoirs restant à faire (non cochés, aujourd'hui et après). */
export function resteAFaire(groupes: GroupeDevoirs[]): number {
  return groupes.reduce((n, g) => n + g.devoirs.filter((d) => !d.fait).length, 0);
}
