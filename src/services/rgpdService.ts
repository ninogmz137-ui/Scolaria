/**
 * RGPD Service — CRUD operations for all 5 RGPD screens.
 *
 * Tables: person_permissions, deletion_requests,
 *         export_history, transfer_codes
 *
 * Falls back to mock data when Supabase is not configured.
 */

import { supabase } from './supabase';
import { ENV } from './getEnv';

// ─── Helper ──────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = ENV.SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

// 1. (supprimé en B1-bis) Permissions par personne : rôles fictifs retirés. Les accès au carnet
//    = les responsables légaux (table responsables, RPC responsables_enfant). Accès partiels des
//    proches : idée future (VISION), table person_permissions conservée mais inutilisée.

// 3. (supprimé en L7) Demandes d'effacement factices (table deletion_requests, « exécution sous 72 h »
//    que rien ne traitait) → services/effacement.ts (M25, exécution serveur).

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
  // Enfants dont l'utilisateur est responsable (RLS, M2) — pas seulement ceux qu'il a créés.
  const { data: children } = await supabase
    .from('children')
    .select('*');

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
