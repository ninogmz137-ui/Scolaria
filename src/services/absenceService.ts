/**
 * Absence Service — CRUD operations for student absences.
 *
 * Parents signal absences; teachers acknowledge them.
 * Falls back to mock data in demo mode.
 */

import { supabase } from './supabase';

// ─── Force mock mode ─────────────────────────────────────

const FORCE_MOCK = true;

function isSupabaseConfigured(): boolean {
  if (FORCE_MOCK) return false;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

// ─── Types ───────────────────────────────────────────────

export type AbsenceMotif =
  | 'maladie'
  | 'maladie_avec_certificat'
  | 'raison_familiale'
  | 'autre';

export type AbsenceStatut = 'signalée' | 'prise_en_compte';

export type DemiJournee = 'matin' | 'apres_midi' | 'journee';

export interface Absence {
  id: string;
  student_id: string;
  student_name: string;
  student_avatar: string;
  academic_year_id: string;
  date_debut: string; // YYYY-MM-DD
  date_fin: string | null; // null = single day
  demi_journee: DemiJournee;
  motif: AbsenceMotif;
  commentaire: string | null;
  statut: AbsenceStatut;
  signalee_par: string; // parent user id
  created_at: string;
}

export interface CreateAbsencePayload {
  student_id: string;
  date_debut: string;
  date_fin: string | null;
  demi_journee: DemiJournee;
  motif: AbsenceMotif;
  commentaire: string | null;
}

// ─── Motif labels ────────────────────────────────────────

export const MOTIF_LABELS: Record<AbsenceMotif, string> = {
  maladie: 'Maladie',
  maladie_avec_certificat: 'Maladie avec certificat',
  raison_familiale: 'Raison familiale',
  autre: 'Autre',
};

export const MOTIF_ICONS: Record<AbsenceMotif, string> = {
  maladie: '🤒',
  maladie_avec_certificat: '🏥',
  raison_familiale: '👨‍👩‍👧',
  autre: '📝',
};

export const DEMI_JOURNEE_LABELS: Record<DemiJournee, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  journee: 'Journée entière',
};

// ─── Mock data ───────────────────────────────────────────

const MOCK_ABSENCES: Absence[] = [
  {
    id: 'abs-1',
    student_id: '2', // Lucas
    student_name: 'Lucas Moreau',
    student_avatar: '👦',
    academic_year_id: 'ay-2025',
    date_debut: '2026-03-25',
    date_fin: null,
    demi_journee: 'journee',
    motif: 'maladie',
    commentaire: 'Fièvre depuis hier soir',
    statut: 'prise_en_compte',
    signalee_par: 'parent-1',
    created_at: '2026-03-25T07:30:00Z',
  },
  {
    id: 'abs-2',
    student_id: '2', // Lucas
    student_name: 'Lucas Moreau',
    student_avatar: '👦',
    academic_year_id: 'ay-2025',
    date_debut: '2026-03-10',
    date_fin: '2026-03-12',
    demi_journee: 'journee',
    motif: 'maladie_avec_certificat',
    commentaire: 'Gastro-entérite — certificat médical transmis',
    statut: 'prise_en_compte',
    signalee_par: 'parent-1',
    created_at: '2026-03-10T07:15:00Z',
  },
  {
    id: 'abs-3',
    student_id: '3', // Emma
    student_name: 'Emma Moreau',
    student_avatar: '👩',
    academic_year_id: 'ay-2025',
    date_debut: '2026-03-27',
    date_fin: null,
    demi_journee: 'matin',
    motif: 'raison_familiale',
    commentaire: 'Rendez-vous médical',
    statut: 'signalée',
    signalee_par: 'parent-1',
    created_at: '2026-03-26T20:00:00Z',
  },
  {
    id: 'abs-4',
    student_id: '1', // Léa
    student_name: 'Léa Moreau',
    student_avatar: '👧',
    academic_year_id: 'ay-2025',
    date_debut: '2026-02-14',
    date_fin: null,
    demi_journee: 'apres_midi',
    motif: 'autre',
    commentaire: null,
    statut: 'prise_en_compte',
    signalee_par: 'parent-1',
    created_at: '2026-02-14T08:00:00Z',
  },
];

// Teacher mock — all class absences
const MOCK_CLASS_ABSENCES: Absence[] = [
  ...MOCK_ABSENCES,
  {
    id: 'abs-5',
    student_id: 's4',
    student_name: 'Adam P.',
    student_avatar: '👦',
    academic_year_id: 'ay-2025',
    date_debut: '2026-03-27',
    date_fin: null,
    demi_journee: 'journee',
    motif: 'maladie',
    commentaire: 'Angine',
    statut: 'signalée',
    signalee_par: 'parent-4',
    created_at: '2026-03-27T07:00:00Z',
  },
  {
    id: 'abs-6',
    student_id: 's5',
    student_name: 'Chloé R.',
    student_avatar: '👧',
    academic_year_id: 'ay-2025',
    date_debut: '2026-03-27',
    date_fin: '2026-03-28',
    demi_journee: 'journee',
    motif: 'raison_familiale',
    commentaire: 'Décès dans la famille',
    statut: 'prise_en_compte',
    signalee_par: 'parent-5',
    created_at: '2026-03-26T18:00:00Z',
  },
];

// In-memory store for new absences (demo mode)
let runtimeAbsences: Absence[] = [...MOCK_ABSENCES];
let runtimeClassAbsences: Absence[] = [...MOCK_CLASS_ABSENCES];

// ─── Parent API ──────────────────────────────────────────

/**
 * Get absences for a specific student.
 */
export async function getStudentAbsences(studentId: string): Promise<Absence[]> {
  if (!isSupabaseConfigured()) {
    return runtimeAbsences
      .filter((a) => a.student_id === studentId)
      .sort((a, b) => b.date_debut.localeCompare(a.date_debut));
  }

  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('student_id', studentId)
    .order('date_debut', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Check if the student already has a pending (signalée) absence for today or future.
 */
export async function hasActiveAbsence(studentId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  if (!isSupabaseConfigured()) {
    return runtimeAbsences.some(
      (a) =>
        a.student_id === studentId &&
        a.date_debut >= today &&
        a.statut === 'signalée',
    );
  }

  const { count } = await supabase
    .from('absences')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .gte('date_debut', today)
    .eq('statut', 'signalée');

  return (count ?? 0) > 0;
}

/**
 * Get today's absence for a student (if any) — for the Accueil banner.
 */
export function getTodayAbsence(studentId: string): Absence | null {
  const today = new Date().toISOString().split('T')[0];
  return (
    runtimeAbsences.find(
      (a) =>
        a.student_id === studentId &&
        a.date_debut <= today &&
        (a.date_fin ? a.date_fin >= today : a.date_debut === today),
    ) || null
  );
}

/**
 * Parent signals an absence.
 */
export async function createAbsence(
  payload: CreateAbsencePayload,
  parentName: string,
  studentName: string,
  studentAvatar: string,
): Promise<Absence> {
  const newAbsence: Absence = {
    id: `abs-${Date.now()}`,
    student_id: payload.student_id,
    student_name: studentName,
    student_avatar: studentAvatar,
    academic_year_id: 'ay-2025',
    date_debut: payload.date_debut,
    date_fin: payload.date_fin,
    demi_journee: payload.demi_journee,
    motif: payload.motif,
    commentaire: payload.commentaire,
    statut: 'signalée',
    signalee_par: 'parent-1',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    runtimeAbsences.unshift(newAbsence);
    runtimeClassAbsences.unshift(newAbsence);
    // Send push notification stub
    sendAbsenceNotification(newAbsence);
    return newAbsence;
  }

  const { data, error } = await supabase
    .from('absences')
    .insert({
      student_id: payload.student_id,
      date_debut: payload.date_debut,
      date_fin: payload.date_fin,
      demi_journee: payload.demi_journee,
      motif: payload.motif,
      commentaire: payload.commentaire,
      statut: 'signalée',
      signalee_par: 'parent-1',
    })
    .select()
    .single();

  if (error) throw error;
  sendAbsenceNotification(data);
  return data;
}

// ─── Teacher API ─────────────────────────────────────────

/**
 * Get all class absences (teacher view).
 */
export async function getClassAbsences(): Promise<Absence[]> {
  if (!isSupabaseConfigured()) {
    return runtimeClassAbsences.sort(
      (a, b) => b.date_debut.localeCompare(a.date_debut),
    );
  }

  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .order('date_debut', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Teacher marks absence as "prise en compte".
 */
export async function markAbsencePriseEnCompte(absenceId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const abs = runtimeClassAbsences.find((a) => a.id === absenceId);
    if (abs) abs.statut = 'prise_en_compte';
    const abs2 = runtimeAbsences.find((a) => a.id === absenceId);
    if (abs2) abs2.statut = 'prise_en_compte';
    return;
  }

  const { error } = await supabase
    .from('absences')
    .update({ statut: 'prise_en_compte' })
    .eq('id', absenceId);

  if (error) throw error;
}

// ─── Notification stubs ──────────────────────────────────

function sendAbsenceNotification(absence: Absence) {
  const dateStr = formatDateFr(absence.date_debut);
  const motifLabel = MOTIF_LABELS[absence.motif];
  console.log(
    `📋 Absence signalée — ${absence.student_name} sera absent(e) ${dateStr} · Motif : ${motifLabel}`,
  );
  // TODO: expo-notifications push to teacher
}

// ─── Helpers ─────────────────────────────────────────────

export function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "aujourd'hui";
  if (d.getTime() === tomorrow.getTime()) return 'demain';

  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDateRange(debut: string, fin: string | null): string {
  if (!fin || fin === debut) return formatDateFr(debut);
  return `du ${formatDateFr(debut)} au ${formatDateFr(fin)}`;
}
