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

// 4. (supprimé en L7) Export factice (table export_history, aucun fichier) → services/exportCarnet.ts.

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
