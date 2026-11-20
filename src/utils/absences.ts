/**
 * absences — règles de l'absence signalée par le parent (lot 4b, CLAUDE.md § Agenda › Absence, COMPONENTS §18.6).
 *
 * - Motifs proposés : Maladie · Rendez-vous · Raison familiale · Autre (sans champ de détail). L'ancienne valeur
 *   « maladie_avec_certificat » (lignes antérieures à M42) s'affiche « Maladie ».
 * - Durée : matin · après-midi · journée (un jour), ou plusieurs jours (date de fin).
 * - Aucun statut « vu par l'enseignant » (décision du 17 nov.) ; message de confirmation : « Absence signalée à
 *   l'école » (jamais « l'enseignant a été notifié » : aucune notification n'est envoyée).
 * - « À justifier » (À faire de l'Accueil) : absence signalée par MOI, sans justificatif, de moins de 30 jours.
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
  justificatif_path?: string | null;
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

/** Absences « à justifier » : signalées par moi, sans justificatif, commencées il y a moins de 30 jours (ou à venir). */
export function aJustifier(absences: AbsenceLue[], moi: string | null | undefined, depuis: string): AbsenceLue[] {
  if (!moi) return [];
  return absences
    .filter((a) => a.signalee_par === moi && !a.justificatif_path && (a.date_fin ?? a.date_debut) >= depuis)
    .sort((x, y) => x.date_debut.localeCompare(y.date_debut));
}

/** Message affiché après l'envoi. Jamais une promesse que l'app ne tient pas (aucune notification n'est envoyée). */
export const CONFIRMATION_ABSENCE = 'Absence signalée à l’école';
