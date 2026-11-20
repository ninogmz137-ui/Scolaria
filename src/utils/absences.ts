/**
 * absences — règles de l'absence signalée par le parent (lot 4b, CLAUDE.md § Agenda › Absence, COMPONENTS §18.6).
 *
 * - Motifs proposés : Maladie · Rendez-vous · Raison familiale · Autre (sans champ de détail). L'ancienne valeur
 *   « maladie_avec_certificat » (lignes antérieures à M42) s'affiche « Maladie ».
 * - Durée : matin · après-midi · journée (un jour), ou plusieurs jours (date de fin).
 * - Aucun statut « vu par l'enseignant » (décision du 17 nov.) ; message de confirmation : « Absence signalée à
 *   l'école » (jamais « l'enseignant a été notifié » : aucune notification n'est envoyée).
 * - « À justifier » (Accueil, Agenda) : absence signalée par un responsable de MON FOYER (moi compris), sans
 *   justificatif, de moins de 30 jours (règle du 20 nov. 2026). Hors foyer (parent séparé) : la carte « Absence »
 *   seulement, ni justificatif ni « À justifier » (la base ne lui rend pas le justificatif, M42).
 * - Aucun participe accordé (le genre de l'enfant n'est pas connu) : « Absence de Lina », jamais « absent(e) ».
 *
 * Module pur : aucun import (testé par node, src/utils/absences.test.mts). Jours 'AAAA-MM-JJ' en heure de Paris.
 */

export type MotifAbsence = 'maladie' | 'rendez_vous' | 'raison_familiale' | 'autre';
/** Valeur lue en base : les quatre motifs, plus l'ancienne valeur antérieure à M42. */
export type MotifLu = MotifAbsence | 'maladie_avec_certificat';
export type DureeAbsence = 'matin' | 'apres_midi' | 'journee' | 'plusieurs_jours';
export type DemiJournee = 'matin' | 'apres_midi' | 'journee';

export const MOTIFS: { id: MotifAbsence; libelle: string }[] = [
  { id: 'maladie', libelle: 'Maladie' },
  { id: 'rendez_vous', libelle: 'Rendez-vous' },
  { id: 'raison_familiale', libelle: 'Raison familiale' },
  { id: 'autre', libelle: 'Autre' },
];

export const DUREES: { id: DureeAbsence; libelle: string }[] = [
  { id: 'matin', libelle: 'Matin' },
  { id: 'apres_midi', libelle: 'Après-midi' },
  { id: 'journee', libelle: 'Journée' },
  { id: 'plusieurs_jours', libelle: 'Plusieurs jours' },
];

export function libelleMotif(m: string | null | undefined): string {
  if (m === 'maladie_avec_certificat') return 'Maladie';
  return MOTIFS.find((x) => x.id === m)?.libelle ?? 'Autre';
}

export interface AbsenceLue {
  id: string;
  student_id: string;
  date_debut: string;
  date_fin: string | null;
  demi_journee: DemiJournee;
  motif: MotifLu;
  commentaire: string | null;
  signalee_par: string;
  /** Chemin du justificatif, s'il existe ET que je peux le voir (foyer de l'auteur, titulaire) ; sinon null. */
  justificatif_path?: string | null;
  /** Je suis responsable du même foyer que l'auteur (ou l'auteur) : je peux joindre le justificatif. */
  meme_foyer?: boolean;
  created_at?: string;
}

/** Valeurs à enregistrer pour une durée choisie (« plusieurs jours » = journées entières jusqu'à la date de fin). */
export function valeursDuree(
  duree: DureeAbsence,
  debut: string,
  fin: string | null,
): { date_fin: string | null; demi_journee: DemiJournee } | { erreur: string } {
  if (duree === 'plusieurs_jours') {
    if (!fin) return { erreur: 'Choisissez le dernier jour d’absence.' };
    if (fin <= debut) return { erreur: 'Le dernier jour doit venir après le premier.' };
    return { date_fin: fin, demi_journee: 'journee' };
  }
  return { date_fin: null, demi_journee: duree };
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « jeu. 26 nov. » */
export function jourCourt(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return `${JOURS[d.getUTCDay()]} ${j === 1 ? '1er' : j} ${MOIS[m - 1]}`;
}

/** « Aujourd’hui », « Demain », ou « jeu. 26 nov. ». */
export function jourRelatif(jour: string, aujourdhui: string, demain: string): string {
  if (jour === aujourdhui) return 'Aujourd’hui';
  if (jour === demain) return 'Demain';
  return jourCourt(jour);
}

/** Période en clair : « Demain · matin », « Aujourd’hui · journée », « Du lun. 23 nov. au mer. 25 nov. ». */
export function periodeAbsence(a: Pick<AbsenceLue, 'date_debut' | 'date_fin' | 'demi_journee'>, aujourdhui: string, demain: string): string {
  if (a.date_fin && a.date_fin !== a.date_debut) return `Du ${jourCourt(a.date_debut)} au ${jourCourt(a.date_fin)}`;
  const moment = a.demi_journee === 'matin' ? 'matin' : a.demi_journee === 'apres_midi' ? 'après-midi' : 'journée';
  return `${jourRelatif(a.date_debut, aujourdhui, demain)} · ${moment}`;
}

/** L'absence couvre-t-elle ce jour ? */
export function couvreJour(a: Pick<AbsenceLue, 'date_debut' | 'date_fin'>, jour: string): boolean {
  const fin = a.date_fin && a.date_fin > a.date_debut ? a.date_fin : a.date_debut;
  return jour >= a.date_debut && jour <= fin;
}

/** Texte de la carte « Absence » de l'Agenda pour un jour : « Matin · Rendez-vous », « Journée · Maladie ». */
export function texteCarteAbsence(a: Pick<AbsenceLue, 'date_fin' | 'date_debut' | 'demi_journee' | 'motif'>): string {
  const plusieurs = !!a.date_fin && a.date_fin !== a.date_debut;
  const moment = plusieurs ? 'Journée' : a.demi_journee === 'matin' ? 'Matin' : a.demi_journee === 'apres_midi' ? 'Après-midi' : 'Journée';
  return `${moment} · ${libelleMotif(a.motif)}`;
}

/** Absence que je peux encore justifier : de mon foyer, sans justificatif. */
export function peutJustifier(a: Pick<AbsenceLue, 'meme_foyer' | 'justificatif_path'>): boolean {
  return !!a.meme_foyer && !a.justificatif_path;
}

/** Absences « à justifier » : de mon foyer, sans justificatif, terminées il y a moins de 30 jours (ou à venir). */
export function aJustifier(absences: AbsenceLue[], depuis: string): AbsenceLue[] {
  return absences
    .filter((a) => peutJustifier(a) && (a.date_fin ?? a.date_debut) >= depuis)
    .sort((x, y) => x.date_debut.localeCompare(y.date_debut));
}

/**
 * Absences telles que l'app les affiche : lignes de `absences`, justificatifs que la base me laisse voir
 * (`absences_justificatifs`, M42 : foyer de l'auteur, titulaire), et « même foyer que l'auteur » calculé depuis
 * `responsables` (lisible par tous les responsables de l'enfant). Même code pour l'app et le test de bout en bout.
 */
export function fusionnerAbsences(
  lignes: Omit<AbsenceLue, 'justificatif_path' | 'meme_foyer'>[],
  justificatifs: { absence_id: string; chemin: string }[],
  responsables: { user_id: string; foyer_id: string }[],
  moi: string | null | undefined,
): AbsenceLue[] {
  const chemins = new Map(justificatifs.map((j) => [String(j.absence_id), String(j.chemin)]));
  const mesFoyers = new Set(responsables.filter((r) => r.user_id === moi).map((r) => r.foyer_id));
  return lignes.map((a) => ({
    ...a,
    justificatif_path: chemins.get(String(a.id)) ?? null,
    meme_foyer: !!moi && (a.signalee_par === moi
      || responsables.some((r) => r.user_id === a.signalee_par && mesFoyers.has(r.foyer_id))),
  }));
}

/** Message affiché après l'envoi. Jamais une promesse que l'app ne tient pas (aucune notification n'est envoyée). */
export const CONFIRMATION_ABSENCE = 'Absence signalée à l’école';
