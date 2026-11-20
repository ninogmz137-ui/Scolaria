/**
 * absenceService — absence signalée par le parent (lot 4b, M42).
 *
 * - Un enfant = un carnet : toujours UN enfant (student_id).
 * - Démo : JAMAIS d'écriture en base (avant le 20 nov. : le repli démo dépendait de la configuration Supabase et la
 *   démo écrivait dans la vraie table). Les absences de démo vivent en mémoire (stores/absencesStore).
 * - Justificatif facultatif : fichier préparé (photo réencodée sans métadonnées ou PDF, utils carnetImport), déposé
 *   dans le bucket privé « carnet » au chemin <enfant>/<année>/<uuid>.<ext>, lu par URL signée d'1 h ; lisible par
 *   les responsables de l'enfant et le titulaire de sa classe seulement (M42).
 * - Aucune notification n'est envoyée, aucun statut « vu » : rien ne le promet (CONFIRMATION_ABSENCE).
 * - Base sans M42 (Paris avant le cycle) : motif « rendez_vous » et justificatif refusés par la base → message clair.
 */
import { supabase } from './supabase';
import { classerErreur } from './erreurs';
import type { FichierPrepare } from './carnetImport';
import type { AbsenceLue, DemiJournee, MotifAbsence } from '../utils/absences';
import { absencesDemo, ajouterAbsenceDemo, remplacerAbsenceDemo, signalerAbsences } from '../stores/absencesStore';

export type { AbsenceLue } from '../utils/absences';

export class ErreurAbsence extends Error {}

function erreurEcriture(error: unknown, defaut: string): ErreurAbsence {
  const type = classerErreur(error);
  if (type === 'reseau') return new ErreurAbsence('Pas de connexion : rien n’a été envoyé, votre saisie est conservée. Réessayez quand le réseau est revenu.');
  if (type === 'session') return new ErreurAbsence('Votre session a expiré : reconnectez-vous, puis recommencez.');
  return new ErreurAbsence(defaut);
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Lecture ─────────────────────────────────────────────

/** Absences de l'enfant (les plus récentes d'abord). Lève en cas d'échec réel. */
export async function chargerAbsences(childId: string, demo: boolean): Promise<AbsenceLue[]> {
  if (demo) return absencesDemo<AbsenceLue>(childId);
  const { data, error } = await supabase
    .from('absences')
    .select('id, student_id, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, justificatif_path, created_at')
    .eq('student_id', childId)
    .order('date_debut', { ascending: false })
    .limit(200);
  if (error && /justificatif_path/.test(error.message)) {
    // Base sans M42 : même lecture, sans la colonne du justificatif.
    const r = await supabase
      .from('absences')
      .select('id, student_id, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, created_at')
      .eq('student_id', childId)
      .order('date_debut', { ascending: false })
      .limit(200);
    if (r.error) throw r.error;
    return (r.data ?? []) as AbsenceLue[];
  }
  if (error) throw error;
  return (data ?? []) as AbsenceLue[];
}

/** Lien de lecture d'un justificatif (URL signée d'1 h), ou null s'il n'est pas lisible. */
export async function lienJustificatif(chemin: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('carnet').createSignedUrl(chemin, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ─── Écriture ────────────────────────────────────────────

export interface NouvelleAbsence {
  childId: string;
  /** Prénom de l'enfant : seul libellé lisible par l'enseignant (qui ne lit pas `children`). */
  prenom: string;
  dateDebut: string;
  dateFin: string | null;
  demiJournee: DemiJournee;
  motif: MotifAbsence;
  mot: string | null;
  justificatif: FichierPrepare | null;
}

/** Année active de l'enfant (dossier du justificatif). */
async function anneeActive(childId: string): Promise<string> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id')
    .eq('student_id', childId)
    .eq('statut', 'active')
    .maybeSingle();
  if (error) throw erreurEcriture(error, 'Envoi impossible. Réessayez.');
  if (!data?.id) throw new ErreurAbsence('Année scolaire introuvable pour cet enfant.');
  return String(data.id);
}

/** Dépose le justificatif ; renvoie son chemin. */
async function deposer(childId: string, f: FichierPrepare): Promise<string> {
  const chemin = `${childId}/${await anneeActive(childId)}/${uuid()}.${f.extension}`;
  const { error } = await supabase.storage.from('carnet').upload(chemin, f.octets, { contentType: f.mime, upsert: false });
  if (error) throw erreurEcriture(error, 'Envoi du justificatif impossible. Réessayez.');
  return chemin;
}

async function moi(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw erreurEcriture(error, 'Envoi impossible. Réessayez.');
  if (!data.user?.id) throw new ErreurAbsence('Session expirée : reconnectez-vous.');
  return data.user.id;
}

/** Signale une absence. Démo : en mémoire seulement. */
export async function signalerAbsence(a: NouvelleAbsence, demo: boolean): Promise<void> {
  if (demo) {
    ajouterAbsenceDemo<AbsenceLue>(a.childId, {
      id: `demo-absence-${uuid()}`,
      student_id: a.childId,
      date_debut: a.dateDebut,
      date_fin: a.dateFin,
      demi_journee: a.demiJournee,
      motif: a.motif,
      commentaire: a.mot,
      signalee_par: 'demo-moi',
      justificatif_path: a.justificatif ? `demo:${a.justificatif.uriLocale}` : null,
      created_at: new Date().toISOString(),
    });
    return;
  }
  const auteur = await moi();
  const chemin = a.justificatif ? await deposer(a.childId, a.justificatif) : null;
  const ligne: Record<string, unknown> = {
    student_id: a.childId,
    student_name: a.prenom,
    date_debut: a.dateDebut,
    date_fin: a.dateFin,
    demi_journee: a.demiJournee,
    motif: a.motif,
    commentaire: a.mot,
    statut: 'signalée',
    signalee_par: auteur,
  };
  if (chemin) ligne.justificatif_path = chemin;
  const { error } = await supabase.from('absences').insert(ligne);
  if (error) {
    // La ligne n'a pas pu être créée : pas de fichier orphelin.
    if (chemin) await supabase.storage.from('carnet').remove([chemin]);
    throw erreurEcriture(error, 'L’absence n’a pas pu être signalée. Réessayez.');
  }
  signalerAbsences(a.childId);
}

/** Ajoute le justificatif d'une absence que j'ai signalée (« À justifier »). */
export async function ajouterJustificatif(absence: AbsenceLue, f: FichierPrepare, demo: boolean): Promise<void> {
  if (demo) {
    remplacerAbsenceDemo<AbsenceLue>(absence.student_id, { ...absence, justificatif_path: `demo:${f.uriLocale}` });
    return;
  }
  const chemin = await deposer(absence.student_id, f);
  const { data, error } = await supabase.from('absences').update({ justificatif_path: chemin }).eq('id', absence.id).select('id');
  if (error || !data?.length) {
    await supabase.storage.from('carnet').remove([chemin]);
    throw error ? erreurEcriture(error, 'Le justificatif n’a pas pu être ajouté. Réessayez.') : new ErreurAbsence('Seul le responsable qui a signalé l’absence peut ajouter le justificatif.');
  }
  signalerAbsences(absence.student_id);
}

// ─── Enseignant ──────────────────────────────────────────

export interface AbsenceClasse extends AbsenceLue {
  student_name: string;
}

/** Absences des élèves de mes classes (titulaire : RLS M42). Démo : aucune. Lève en cas d'échec. */
export async function absencesDeMesClasses(demo: boolean): Promise<AbsenceClasse[]> {
  if (demo) return [];
  const { data, error } = await supabase
    .from('absences')
    .select('id, student_id, student_name, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, justificatif_path, created_at')
    .order('date_debut', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as AbsenceClasse[];
}
