/**
 * Liaison Service — CRUD operations for Cahier de Liaison
 *
 * Handles mots de liaison (teacher→parent messages) and signatures.
 * Falls back to mock data in demo mode.
 */

import { supabase } from './supabase';
import { ENV } from './getEnv';

// ─── Helper ──────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = ENV.SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

// ─── Types ───────────────────────────────────────────────

export type MotLiaisonType = 'info' | 'autorisation' | 'bon_de_sortie';
export type MotLiaisonStatut = 'brouillon' | 'envoyé' | 'clos';

export interface MotLiaison {
  id: string;
  teacher_id: string;
  classe: string;
  type: MotLiaisonType;
  titre: string;
  contenu: string;
  date_envoi: string;
  date_limite: string | null;
  statut: MotLiaisonStatut;
  requires_signature: boolean;
  created_at: string;
  // Computed for list display
  signatures_count: number;
  total_students: number;
}

export interface SignatureLiaison {
  id: string;
  mot_id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  parent_name: string;
  signed_at: string;
}

// ─── Mock data — Teacher view ────────────────────────────

const MOCK_STUDENTS = [
  { id: 's1', name: 'Léa M.', avatar: '👧' },
  { id: 's2', name: 'Lucas D.', avatar: '👦' },
  { id: 's3', name: 'Emma L.', avatar: '👧' },
  { id: 's4', name: 'Adam P.', avatar: '👦' },
  { id: 's5', name: 'Chloé R.', avatar: '👧' },
  { id: 's6', name: 'Hugo G.', avatar: '👦' },
  { id: 's7', name: 'Mathis B.', avatar: '👦' },
  { id: 's8', name: 'Inès K.', avatar: '👧' },
  { id: 's9', name: 'Raphaël T.', avatar: '👦' },
  { id: 's10', name: 'Jade F.', avatar: '👧' },
  { id: 's11', name: 'Nathan C.', avatar: '👦' },
  { id: 's12', name: 'Manon A.', avatar: '👧' },
  { id: 's13', name: 'Enzo V.', avatar: '👦' },
  { id: 's14', name: 'Alice W.', avatar: '👧' },
  { id: 's15', name: 'Tom H.', avatar: '👦' },
  { id: 's16', name: 'Louise S.', avatar: '👧' },
  { id: 's17', name: 'Léo J.', avatar: '👦' },
  { id: 's18', name: 'Lina Z.', avatar: '👧' },
  { id: 's19', name: 'Gabin N.', avatar: '👦' },
  { id: 's20', name: 'Clara E.', avatar: '👧' },
  { id: 's21', name: 'Sacha O.', avatar: '👦' },
  { id: 's22', name: 'Zoé Q.', avatar: '👧' },
  { id: 's23', name: 'Paul I.', avatar: '👦' },
  { id: 's24', name: 'Camille U.', avatar: '👧' },
  { id: 's25', name: 'Axel Y.', avatar: '👦' },
];

const MOCK_MOTS: MotLiaison[] = [
  {
    id: 'mot-1',
    teacher_id: 't1',
    classe: 'CM2 B',
    type: 'autorisation',
    titre: 'Sortie au Musée d\'Orsay — 15 avril',
    contenu: 'Chers parents,\n\nNous organisons une sortie scolaire au Musée d\'Orsay le mardi 15 avril 2026. Le départ est prévu à 8h30 devant l\'école et le retour vers 16h30.\n\nLes enfants devront apporter un pique-nique et une bouteille d\'eau. Le transport sera assuré en car.\n\nMerci de bien vouloir signer cette autorisation avant le 10 avril.',
    date_envoi: '2026-03-25',
    date_limite: '2026-04-10',
    statut: 'envoyé',
    requires_signature: true,
    created_at: '2026-03-25T08:00:00Z',
    signatures_count: 18,
    total_students: 25,
  },
  {
    id: 'mot-2',
    teacher_id: 't1',
    classe: 'CM2 B',
    type: 'info',
    titre: 'Photos de classe — 2 avril',
    contenu: 'Chers parents,\n\nLa photo de classe aura lieu le mercredi 2 avril. Merci de veiller à ce que votre enfant soit bien habillé ce jour-là.\n\nLes photos individuelles et de groupe seront proposées à la vente ultérieurement.\n\nCordialement,\nMme Dupont',
    date_envoi: '2026-03-24',
    date_limite: null,
    statut: 'envoyé',
    requires_signature: false,
    created_at: '2026-03-24T14:30:00Z',
    signatures_count: 0,
    total_students: 25,
  },
  {
    id: 'mot-3',
    teacher_id: 't1',
    classe: 'CM2 B',
    type: 'bon_de_sortie',
    titre: 'Autorisation de sortie anticipée — 28 mars',
    contenu: 'Chers parents,\n\nEn raison d\'une réunion pédagogique, les cours se termineront exceptionnellement à 15h le vendredi 28 mars.\n\nMerci de signer ce bon de sortie pour confirmer que votre enfant pourra quitter l\'école à cette heure.\n\nSi vous ne pouvez pas récupérer votre enfant, la garderie sera assurée jusqu\'à 17h30.',
    date_envoi: '2026-03-22',
    date_limite: '2026-03-27',
    statut: 'envoyé',
    requires_signature: true,
    created_at: '2026-03-22T10:00:00Z',
    signatures_count: 23,
    total_students: 25,
  },
  {
    id: 'mot-4',
    teacher_id: 't1',
    classe: 'CM2 B',
    type: 'info',
    titre: 'Réunion parents-professeurs — 20 mars',
    contenu: 'La réunion parents-professeurs du 2ème trimestre a eu lieu le 20 mars. Merci à tous les parents présents.\n\nPour ceux qui n\'ont pas pu venir, n\'hésitez pas à prendre rendez-vous via la messagerie.',
    date_envoi: '2026-03-15',
    date_limite: null,
    statut: 'clos',
    requires_signature: false,
    created_at: '2026-03-15T09:00:00Z',
    signatures_count: 0,
    total_students: 25,
  },
  {
    id: 'mot-5',
    teacher_id: 't1',
    classe: 'CM2 B',
    type: 'autorisation',
    titre: 'Piscine — Cycle natation T2',
    contenu: 'Chers parents,\n\nLe cycle natation du 2ème trimestre débutera le lundi 10 mars. Les séances auront lieu tous les lundis de 10h à 11h30 à la piscine municipale.\n\nMerci de fournir un maillot de bain, un bonnet et une serviette. Une autorisation parentale est obligatoire.',
    date_envoi: '2026-03-01',
    date_limite: '2026-03-08',
    statut: 'clos',
    requires_signature: true,
    created_at: '2026-03-01T08:00:00Z',
    signatures_count: 25,
    total_students: 25,
  },
];

const MOCK_SIGNATURES: SignatureLiaison[] = [
  // mot-1: 18/25 signed
  ...MOCK_STUDENTS.slice(0, 18).map((s, i) => ({
    id: `sig-1-${i}`,
    mot_id: 'mot-1',
    parent_id: `p-${s.id}`,
    student_id: s.id,
    student_name: s.name,
    parent_name: `Parent de ${s.name}`,
    signed_at: `2026-03-${25 + Math.floor(i / 6)}T${10 + (i % 8)}:${String(i * 3).padStart(2, '0')}:00Z`,
  })),
  // mot-3: 23/25 signed
  ...MOCK_STUDENTS.slice(0, 23).map((s, i) => ({
    id: `sig-3-${i}`,
    mot_id: 'mot-3',
    parent_id: `p-${s.id}`,
    student_id: s.id,
    student_name: s.name,
    parent_name: `Parent de ${s.name}`,
    signed_at: `2026-03-${22 + Math.floor(i / 8)}T${9 + (i % 10)}:${String(i * 2).padStart(2, '0')}:00Z`,
  })),
  // mot-5: 25/25 signed (all)
  ...MOCK_STUDENTS.map((s, i) => ({
    id: `sig-5-${i}`,
    mot_id: 'mot-5',
    parent_id: `p-${s.id}`,
    student_id: s.id,
    student_name: s.name,
    parent_name: `Parent de ${s.name}`,
    signed_at: `2026-03-0${1 + Math.floor(i / 8)}T${8 + (i % 12)}:${String(i * 2).padStart(2, '0')}:00Z`,
  })),
];

// ─── Mock data — Parent view (per child) ─────────────────

export interface MotLiaisonParent {
  id: string;
  type: MotLiaisonType;
  titre: string;
  contenu: string;
  date_envoi: string;
  date_limite: string | null;
  requires_signature: boolean;
  is_signed: boolean;
  signed_at: string | null;
  is_read: boolean;
  teacher_name: string;
  classe: string;
}

function getMockParentMots(childId: string): MotLiaisonParent[] {
  const isSigned = (motId: string) => {
    // Léa & Lucas signed mot-1 and mot-3, Emma didn't sign mot-1
    if (childId === '3' && motId === 'mot-1') return false;
    if (motId === 'mot-1' || motId === 'mot-3' || motId === 'mot-5') return true;
    return false;
  };

  return [
    {
      id: 'mot-1',
      type: 'autorisation',
      titre: 'Sortie au Musée d\'Orsay — 15 avril',
      contenu: 'Chers parents,\n\nNous organisons une sortie scolaire au Musée d\'Orsay le mardi 15 avril 2026. Le départ est prévu à 8h30 devant l\'école et le retour vers 16h30.\n\nLes enfants devront apporter un pique-nique et une bouteille d\'eau. Le transport sera assuré en car.\n\nMerci de bien vouloir signer cette autorisation avant le 10 avril.',
      date_envoi: '2026-03-25',
      date_limite: '2026-04-10',
      requires_signature: true,
      is_signed: isSigned('mot-1'),
      signed_at: isSigned('mot-1') ? '2026-03-26T14:30:00Z' : null,
      is_read: true,
      teacher_name: 'Mme Dupont',
      classe: childId === '1' ? 'GS' : childId === '2' ? 'CM2 B' : '3ème A',
    },
    {
      id: 'mot-2',
      type: 'info',
      titre: 'Photos de classe — 2 avril',
      contenu: 'Chers parents,\n\nLa photo de classe aura lieu le mercredi 2 avril. Merci de veiller à ce que votre enfant soit bien habillé ce jour-là.\n\nLes photos individuelles et de groupe seront proposées à la vente ultérieurement.\n\nCordialement,\nMme Dupont',
      date_envoi: '2026-03-24',
      date_limite: null,
      requires_signature: false,
      is_signed: false,
      signed_at: null,
      is_read: true,
      teacher_name: 'Mme Dupont',
      classe: childId === '1' ? 'GS' : childId === '2' ? 'CM2 B' : '3ème A',
    },
    {
      id: 'mot-3',
      type: 'bon_de_sortie',
      titre: 'Autorisation de sortie anticipée — 28 mars',
      contenu: 'Chers parents,\n\nEn raison d\'une réunion pédagogique, les cours se termineront exceptionnellement à 15h le vendredi 28 mars.\n\nMerci de signer ce bon de sortie pour confirmer que votre enfant pourra quitter l\'école à cette heure.\n\nSi vous ne pouvez pas récupérer votre enfant, la garderie sera assurée jusqu\'à 17h30.',
      date_envoi: '2026-03-22',
      date_limite: '2026-03-27',
      requires_signature: true,
      is_signed: isSigned('mot-3'),
      signed_at: isSigned('mot-3') ? '2026-03-23T09:15:00Z' : null,
      is_read: true,
      teacher_name: 'Mme Dupont',
      classe: childId === '1' ? 'GS' : childId === '2' ? 'CM2 B' : '3ème A',
    },
    {
      id: 'mot-6',
      type: 'autorisation',
      titre: 'Intervention d\'un pompier — 5 avril',
      contenu: 'Chers parents,\n\nDans le cadre du programme de prévention, un pompier interviendra dans la classe le samedi 5 avril pour une initiation aux gestes de premiers secours.\n\nMerci de signer cette autorisation.',
      date_envoi: '2026-03-27',
      date_limite: '2026-04-03',
      requires_signature: true,
      is_signed: false,
      signed_at: null,
      is_read: false,
      teacher_name: 'Mme Dupont',
      classe: childId === '1' ? 'GS' : childId === '2' ? 'CM2 B' : '3ème A',
    },
  ];
}

// ═══════════════════════════════════════════════════════════
// API — Teacher side
// ═══════════════════════════════════════════════════════════

export async function getTeacherMots(teacherId: string): Promise<{
  data: MotLiaison[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { data: MOCK_MOTS, error: null };
  }

  // Fetch mots with signature counts
  const { data: rawMots, error } = await supabase
    .from('mots_liaison')
    .select('*, signatures(count)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  // Get total students per classe (for progress display)
  const classes = [...new Set((rawMots ?? []).map((m: any) => m.classe))];
  const classCounts: Record<string, number> = {};
  for (const cls of classes) {
    const { count } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('classe', cls);
    classCounts[cls] = count ?? 0;
  }

  const data: MotLiaison[] = (rawMots ?? []).map((m: any) => ({
    ...m,
    signatures_count: m.signatures?.[0]?.count ?? 0,
    total_students: classCounts[m.classe] ?? 0,
  }));

  return { data, error: null };
}

export async function getMotSignatures(motId: string): Promise<{
  data: SignatureLiaison[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: MOCK_SIGNATURES.filter((s) => s.mot_id === motId),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('mot_id', motId)
    .order('signed_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function getUnsignedStudents(motId: string): Promise<{
  data: { id: string; name: string; avatar: string }[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    const signedIds = MOCK_SIGNATURES
      .filter((s) => s.mot_id === motId)
      .map((s) => s.student_id);
    const unsigned = MOCK_STUDENTS.filter((s) => !signedIds.includes(s.id));
    return { data: unsigned, error: null };
  }

  // Get the mot to know the classe
  const { data: mot } = await supabase
    .from('mots_liaison')
    .select('classe')
    .eq('id', motId)
    .single();

  if (!mot) return { data: [], error: 'Mot non trouvé' };

  // Get all students in that class
  const { data: allStudents } = await supabase
    .from('children')
    .select('id, first_name, last_name, avatar_emoji')
    .eq('classe', mot.classe);

  // Get signed student IDs for this mot
  const { data: sigs } = await supabase
    .from('signatures')
    .select('student_id')
    .eq('mot_id', motId);

  const signedIds = new Set((sigs ?? []).map((s: any) => s.student_id));
  const unsigned = (allStudents ?? [])
    .filter((s: any) => !signedIds.has(s.id))
    .map((s: any) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      avatar: s.avatar_emoji ?? '👦',
    }));

  return { data: unsigned, error: null };
}

export async function createMotLiaison(mot: {
  teacher_id: string;
  classe: string;
  type: MotLiaisonType;
  titre: string;
  contenu: string;
  date_limite?: string;
  statut: MotLiaisonStatut;
}): Promise<{ data: MotLiaison | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const newMot: MotLiaison = {
      id: `mot-new-${Date.now()}`,
      teacher_id: mot.teacher_id,
      classe: mot.classe,
      type: mot.type,
      titre: mot.titre,
      contenu: mot.contenu,
      date_envoi: new Date().toISOString().split('T')[0],
      date_limite: mot.date_limite ?? null,
      statut: mot.statut,
      requires_signature: mot.type !== 'info',
      created_at: new Date().toISOString(),
      signatures_count: 0,
      total_students: 25,
    };
    return { data: newMot, error: null };
  }

  const { data, error } = await supabase
    .from('mots_liaison')
    .insert({
      ...mot,
      requires_signature: mot.type !== 'info',
      date_envoi: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function updateMotStatut(
  motId: string,
  statut: MotLiaisonStatut,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  const { error } = await supabase
    .from('mots_liaison')
    .update({ statut })
    .eq('id', motId);

  return { error: error?.message ?? null };
}

// ═══════════════════════════════════════════════════════════
// API — Parent side
// ═══════════════════════════════════════════════════════════

export async function getParentMots(childId: string): Promise<{
  data: MotLiaisonParent[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { data: getMockParentMots(childId), error: null };
  }

  // Get the child's classe to filter mots
  const { data: child } = await supabase
    .from('children')
    .select('classe')
    .eq('id', childId)
    .single();

  if (!child) return { data: [], error: 'Enfant non trouvé' };

  // Get mots for this class
  const { data: mots, error } = await supabase
    .from('mots_liaison')
    .select('*, signatures!left(student_id, signed_at)')
    .eq('classe', child.classe)
    .in('statut', ['envoyé', 'clos'])
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  // Check read receipts for this parent
  const { data: receipts } = await supabase
    .from('read_receipts')
    .select('mot_id')
    .eq('parent_id', (await supabase.auth.getUser()).data.user?.id ?? '');

  const readMotIds = new Set((receipts ?? []).map((r: any) => r.mot_id));

  // Get teacher names
  const teacherIds = [...new Set((mots ?? []).map((m: any) => m.teacher_id))];
  const teacherNames: Record<string, string> = {};
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, first_name, family_name')
      .in('id', teacherIds);
    for (const t of teachers ?? []) {
      teacherNames[t.id] = `${t.first_name ?? ''} ${t.family_name ?? ''}`.trim() || 'Enseignant';
    }
  }

  const parentMots: MotLiaisonParent[] = (mots ?? []).map((m: any) => {
    const childSig = (m.signatures ?? []).find((s: any) => s.student_id === childId);
    return {
      id: m.id,
      type: m.type,
      titre: m.titre,
      contenu: m.contenu,
      date_envoi: m.date_envoi,
      date_limite: m.date_limite,
      requires_signature: m.requires_signature,
      is_signed: !!childSig,
      signed_at: childSig?.signed_at ?? null,
      is_read: readMotIds.has(m.id),
      teacher_name: teacherNames[m.teacher_id] ?? 'Enseignant',
      classe: m.classe,
    };
  });

  return { data: parentMots, error: null };
}

export async function signMotLiaison(
  motId: string,
  parentId: string,
  studentId: string,
  parentName: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  const { error } = await supabase
    .from('signatures')
    .insert({
      mot_id: motId,
      parent_id: parentId,
      student_id: studentId,
      parent_name: parentName,
      signed_at: new Date().toISOString(),
    });

  return { error: error?.message ?? null };
}

export async function markMotAsRead(
  motId: string,
  parentId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // In real impl: update a read_receipts table
  await supabase
    .from('read_receipts')
    .upsert({ mot_id: motId, parent_id: parentId, read_at: new Date().toISOString() });
}

// ─── Notification stubs ──────────────────────────────────

export async function sendRelanceNotification(
  motId: string,
  unsignedStudentIds: string[],
): Promise<void> {
  // In prod: send push notifications to parents of unsigned students
  console.log(`[Liaison] Relance envoyée pour mot ${motId} à ${unsignedStudentIds.length} parents`);
}

export async function sendNewMotNotification(
  classe: string,
  titre: string,
): Promise<void> {
  // In prod: send push notification to all parents of the class
  console.log(`[Liaison] Notification nouveau mot: "${titre}" pour ${classe}`);
}
