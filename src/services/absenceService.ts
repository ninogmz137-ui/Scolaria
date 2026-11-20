/**
 * absenceService — absence signalée par le parent (lot 4b, M42).
 *
 * - Un enfant = un carnet : toujours UN enfant (student_id).
 * - Démo : JAMAIS d'écriture en base (avant le 20 nov. : le repli démo dépendait de la configuration Supabase et la
 *   démo écrivait dans la vraie table). Les absences de démo vivent en mémoire (stores/absencesStore).
 * - Justificatif facultatif : fichier préparé (photo réencodée sans métadonnées ou PDF, utils carnetImport), déposé
 *   dans le bucket privé « carnet » au chemin <enfant>/<année>/<uuid>.<ext>, rangé dans absences_justificatifs, lu par
 *   URL signée d'1 h. Lisible et joignable par les responsables du FOYER de l'auteur de l'absence (quel que soit celui
 *   qui l'a signalée), lisible par le titulaire ; invisible pour un responsable d'un autre foyer (M42, règle du 20 nov.).
 * - Aucune notification n'est envoyée, aucun statut « vu » : rien ne le promet (CONFIRMATION_ABSENCE).
 * - Base sans M42 (Paris avant le cycle) : motif « rendez_vous » et justificatif refusés par la base → message clair.
 */
import { supabase } from './supabase';
import { classerErreur } from './erreurs';
import type { FichierPrepare } from './carnetImport';
import { fusionnerAbsences, type AbsenceLue, type DemiJournee, type MotifAbsence } from '../utils/absences';
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

const COLONNES = 'id, student_id, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, created_at';

/** Table absente (base sans M42) : PostgREST rend PGRST205 / 42P01. */
function tableAbsente(error: { code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST205' || error.code === '42P01');
}

/** Justificatifs que la base me laisse voir pour ces absences (foyer de l'auteur, titulaire). */
async function justificatifsVisibles(ids: string[]): Promise<{ absence_id: string; chemin: string }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('absences_justificatifs').select('absence_id, chemin').in('absence_id', ids);
  if (tableAbsente(error)) return [];
  if (error) throw error;
  return (data ?? []) as { absence_id: string; chemin: string }[];
}

/** Absences de l'enfant (les plus récentes d'abord), avec justificatif visible et « même foyer ». Lève en cas d'échec. */
export async function chargerAbsences(childId: string, demo: boolean): Promise<AbsenceLue[]> {
  if (demo) return absencesDemo<AbsenceLue>(childId);
  const [lignes, responsables, auth] = await Promise.all([
    supabase.from('absences').select(COLONNES).eq('student_id', childId).order('date_debut', { ascending: false }).limit(200),
    supabase.from('responsables').select('user_id, foyer_id').eq('child_id', childId),
    supabase.auth.getUser(),
  ]);
  if (lignes.error) throw lignes.error;
  if (responsables.error) throw responsables.error;
  const absences = (lignes.data ?? []) as Omit<AbsenceLue, 'justificatif_path' | 'meme_foyer'>[];
  const justificatifs = await justificatifsVisibles(absences.map((a) => a.id));
  return fusionnerAbsences(absences, justificatifs, (responsables.data ?? []) as { user_id: string; foyer_id: string }[], auth.data.user?.id);
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

/** Joint (ou remplace) le justificatif d'une absence : dépôt du fichier puis ligne absences_justificatifs. */
async function joindre(absenceId: string, childId: string, f: FichierPrepare, auteur: string): Promise<void> {
  const chemin = await deposer(childId, f);
  const { error } = await supabase
    .from('absences_justificatifs')
    .upsert({ absence_id: absenceId, chemin, depose_par: auteur }, { onConflict: 'absence_id' });
  if (error) {
    await supabase.storage.from('carnet').remove([chemin]);
    throw error.code === '42501'
      ? new ErreurAbsence('Seuls les responsables du foyer qui a signalé l’absence peuvent joindre le justificatif.')
      : erreurEcriture(error, 'Le justificatif n’a pas pu être joint. Réessayez.');
  }
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
      meme_foyer: true,
      created_at: new Date().toISOString(),
    });
    return;
  }
  const auteur = await moi();
  const { data, error } = await supabase
    .from('absences')
    .insert({
      student_id: a.childId,
      student_name: a.prenom,
      date_debut: a.dateDebut,
      date_fin: a.dateFin,
      demi_journee: a.demiJournee,
      motif: a.motif,
      commentaire: a.mot,
      statut: 'signalée',
      signalee_par: auteur,
    })
    .select('id')
    .single();
  if (error || !data) throw erreurEcriture(error, 'L’absence n’a pas pu être signalée. Réessayez.');
  signalerAbsences(a.childId);
  if (a.justificatif) {
    try {
      await joindre(String(data.id), a.childId, a.justificatif, auteur);
    } catch {
      // L'absence EST signalée : on le dit, et le justificatif reste à joindre depuis « À justifier ».
      throw new ErreurAbsence('L’absence est signalée à l’école, mais le justificatif n’a pas pu être joint. Joignez-le depuis « Absence à justifier ».');
    }
    signalerAbsences(a.childId);
  }
}

/** Joint le justificatif d'une absence de mon foyer (« À justifier »), quel que soit celui qui l'a signalée. */
export async function ajouterJustificatif(absence: AbsenceLue, f: FichierPrepare, demo: boolean): Promise<void> {
  if (demo) {
    remplacerAbsenceDemo<AbsenceLue>(absence.student_id, { ...absence, justificatif_path: `demo:${f.uriLocale}` });
    return;
  }
  await joindre(absence.id, absence.student_id, f, await moi());
  signalerAbsences(absence.student_id);
}

// ─── Enseignant ──────────────────────────────────────────

export interface AbsenceClasse extends AbsenceLue {
  student_name: string;
}

/** Absences des élèves de mes classes (titulaire : RLS M42), avec leur justificatif. Démo : aucune. Lève en cas d'échec. */
export async function absencesDeMesClasses(demo: boolean): Promise<AbsenceClasse[]> {
  if (demo) return [];
  const { data, error } = await supabase
    .from('absences')
    .select(`${COLONNES}, student_name`)
    .order('date_debut', { ascending: false })
    .limit(500);
  if (error) throw error;
  const lignes = (data ?? []) as (Omit<AbsenceLue, 'justificatif_path' | 'meme_foyer'> & { student_name: string })[];
  const chemins = new Map((await justificatifsVisibles(lignes.map((a) => a.id))).map((j) => [j.absence_id, j.chemin]));
  return lignes.map((a) => ({ ...a, justificatif_path: chemins.get(a.id) ?? null, meme_foyer: false }));
}

