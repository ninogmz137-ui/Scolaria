/**
 * RGPD Service — CRUD operations for all 5 RGPD screens.
 *
 * Tables: person_permissions, access_journal, deletion_requests,
 *         export_history, transfer_codes
 *
 * Falls back to mock data when Supabase is not configured.
 */

import { supabase } from './supabase';

// ─── Helper ──────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

// ═══════════════════════════════════════════════════════════
// 1. PERSON PERMISSIONS
// ═══════════════════════════════════════════════════════════

export interface PersonPermission {
  id: string;
  family_id: string;
  name: string;
  email: string | null;
  avatar: string;
  role: string;
  access_level: 'tuteur' | 'famille_proche' | 'accompagnant' | 'minimal';
  modules: {
    notes: boolean;
    agenda: boolean;
    ressenti: boolean;
    profil: boolean;
    photos: boolean;
    aria: boolean;
  };
  last_access: string | null;
  created_at: string;
}

export async function getPermissions(): Promise<PersonPermission[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('person_permissions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[RGPD] getPermissions error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createPermission(person: Omit<PersonPermission, 'id' | 'family_id' | 'created_at' | 'last_access'>): Promise<PersonPermission | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('person_permissions')
    .insert({ ...person, family_id: userId })
    .select()
    .single();

  if (error) {
    console.warn('[RGPD] createPermission error:', error.message);
    return null;
  }
  return data;
}

export async function updatePermission(id: string, updates: Partial<Pick<PersonPermission, 'access_level' | 'modules'>>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('person_permissions')
    .update(updates)
    .eq('id', id);

  if (error) console.warn('[RGPD] updatePermission error:', error.message);
}

export async function deletePermission(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('person_permissions')
    .delete()
    .eq('id', id);

  if (error) console.warn('[RGPD] deletePermission error:', error.message);
}

// ═══════════════════════════════════════════════════════════
// 2. ACCESS JOURNAL
// ═══════════════════════════════════════════════════════════

export interface AccessEntry {
  id: string;
  person_name: string;
  person_avatar: string;
  person_role: string;
  action: string;
  module: string;
  module_icon: string;
  child_name: string | null;
  ip_address: string | null;
  device: string | null;
  color: string;
  created_at: string;
}

export async function getAccessJournal(filter: 'all' | 'today' | 'week' | 'month' = 'all'): Promise<AccessEntry[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('access_journal')
    .select('*')
    .order('created_at', { ascending: false });

  const now = new Date();
  if (filter === 'today') {
    const today = now.toISOString().split('T')[0];
    query = query.gte('created_at', today);
  } else if (filter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', weekAgo);
  } else if (filter === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', monthAgo);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[RGPD] getAccessJournal error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function logAccess(entry: Omit<AccessEntry, 'id' | 'created_at'>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const userId = await getUserId();
  const { error } = await supabase
    .from('access_journal')
    .insert({ ...entry, family_id: userId });

  if (error) console.warn('[RGPD] logAccess error:', error.message);
}

// ═══════════════════════════════════════════════════════════
// 3. DELETION REQUESTS
// ═══════════════════════════════════════════════════════════

export interface DeletionRequest {
  id: string;
  family_id: string;
  child_id: string | null;
  scope: 'child' | 'account';
  confirm_email: string;
  status: 'pending' | 'confirmed' | 'executing' | 'completed' | 'cancelled';
  created_at: string;
  confirm_deadline: string;
  execute_deadline: string;
  completed_at: string | null;
}

export async function createDeletionRequest(req: {
  child_id: string | null;
  scope: 'child' | 'account';
  confirm_email: string;
}): Promise<DeletionRequest | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('deletion_requests')
    .insert({ ...req, family_id: userId })
    .select()
    .single();

  if (error) {
    console.warn('[RGPD] createDeletionRequest error:', error.message);
    return null;
  }
  return data;
}

export async function getDeletionRequests(): Promise<DeletionRequest[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('deletion_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[RGPD] getDeletionRequests error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function cancelDeletionRequest(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('deletion_requests')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) console.warn('[RGPD] cancelDeletionRequest error:', error.message);
}

/**
 * Get data counts per category for a child (for deletion preview).
 */
export async function getChildDataCounts(childId: string): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};

  const counts: Record<string, number> = {};

  const tables = [
    { key: 'notes', table: 'grades', col: 'child_id' },
    { key: 'agenda', table: 'agenda_events', col: 'child_id' },
    { key: 'ressenti', table: 'checkins', col: 'child_id' },
  ];

  for (const { key, table, col } of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(col, childId);
    counts[key] = count ?? 0;
  }

  return counts;
}

// ═══════════════════════════════════════════════════════════
// 4. EXPORT HISTORY
// ═══════════════════════════════════════════════════════════

export interface ExportRecord {
  id: string;
  family_id: string;
  format: 'json' | 'pdf' | 'json+pdf';
  modules: string[];
  total_size: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url: string | null;
  created_at: string;
}

export async function getExportHistory(): Promise<ExportRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('export_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[RGPD] getExportHistory error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createExport(req: {
  format: 'json' | 'pdf' | 'json+pdf';
  modules: string[];
  total_size: string;
}): Promise<ExportRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('export_history')
    .insert({ ...req, family_id: userId, status: 'processing' })
    .select()
    .single();

  if (error) {
    console.warn('[RGPD] createExport error:', error.message);
    return null;
  }
  return data;
}

export async function updateExportStatus(id: string, status: ExportRecord['status'], fileUrl?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const updates: any = { status };
  if (fileUrl) updates.file_url = fileUrl;

  const { error } = await supabase
    .from('export_history')
    .update(updates)
    .eq('id', id);

  if (error) console.warn('[RGPD] updateExportStatus error:', error.message);
}

/**
 * Build the RGPD-compliant JSON export for a family.
 */
export async function buildExportData(familyId: string, moduleKeys: string[]): Promise<object> {
  const exportData: any = {
    scolaria_export: {
      version: '1.0',
      generated_at: new Date().toISOString(),
      format: 'RGPD Article 20 — Portabilité des données',
      family: { children: [] },
    },
  };

  // Get children
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', familyId);

  for (const child of children ?? []) {
    const childExport: any = {
      scolaria_id: child.scolaria_id,
      name: `${child.first_name} ${child.last_name}`.trim(),
      classe: child.classe,
      school: child.school,
    };

    if (moduleKeys.includes('notes')) {
      const { data } = await supabase.from('grades').select('*').eq('child_id', child.id);
      childExport.notes = data ?? [];
    }
    if (moduleKeys.includes('agenda')) {
      const { data } = await supabase.from('agenda_events').select('*').eq('child_id', child.id);
      childExport.agenda = data ?? [];
    }
    if (moduleKeys.includes('ressenti')) {
      const { data } = await supabase.from('checkins').select('*').eq('child_id', child.id);
      childExport.ressenti = data ?? [];
    }
    if (moduleKeys.includes('aria')) {
      const { data } = await supabase
        .from('aria_conversations')
        .select('*, aria_messages(*)')
        .eq('child_id', child.id);
      childExport.conversations_aria = data ?? [];
    }

    exportData.scolaria_export.family.children.push(childExport);
  }

  // Family-level data
  if (moduleKeys.includes('permissions')) {
    const { data } = await supabase.from('person_permissions').select('*').eq('family_id', familyId);
    exportData.scolaria_export.family.permissions = data ?? [];
  }
  if (moduleKeys.includes('journal')) {
    const { data } = await supabase.from('access_journal').select('*').eq('family_id', familyId);
    exportData.scolaria_export.family.access_journal = data ?? [];
  }

  return exportData;
}

// ═══════════════════════════════════════════════════════════
// 5. TRANSFER CODES
// ═══════════════════════════════════════════════════════════

export interface TransferCode {
  id: string;
  family_id: string;
  child_id: string;
  child_name: string;
  child_avatar: string;
  code: string;
  from_school: string;
  to_school: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
}

function generateTransferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const year = new Date().getFullYear();
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SCA-TRANSFER-${year}-${suffix}`;
}

export async function getTransferCodes(): Promise<TransferCode[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('transfer_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[RGPD] getTransferCodes error:', error.message);
    return [];
  }

  // Auto-expire codes past their expiry date
  const now = new Date().toISOString();
  return (data ?? []).map((c: any) => ({
    ...c,
    status: c.status === 'active' && c.expires_at < now ? 'expired' : c.status,
  }));
}

export async function createTransferCode(child: {
  child_id: string;
  child_name: string;
  child_avatar: string;
  from_school: string;
}): Promise<TransferCode | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getUserId();
  const code = generateTransferCode();

  const { data, error } = await supabase
    .from('transfer_codes')
    .insert({
      family_id: userId,
      child_id: child.child_id,
      child_name: child.child_name,
      child_avatar: child.child_avatar,
      code,
      from_school: child.from_school,
    })
    .select()
    .single();

  if (error) {
    console.warn('[RGPD] createTransferCode error:', error.message);
    return null;
  }
  return data;
}

export async function revokeTransferCode(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('transfer_codes')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) console.warn('[RGPD] revokeTransferCode error:', error.message);
}
