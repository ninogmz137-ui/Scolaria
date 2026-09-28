/**
 * Edge Function « executer-effacements » (L7, D6) — exécute les effacements échus (30 jours après la demande)
 * et nettoie les fichiers orphelins du bucket « carnet ».
 *
 * - Appelée UNIQUEMENT par la tâche planifiée (pg_cron + pg_net, une fois par jour), avec la clé service en
 *   Authorization : tout autre appelant → 401, rien n'est fait. Déployée avec --no-verify-jwt : la
 *   vérification est faite ici (comparaison à SUPABASE_SERVICE_ROLE_KEY), pas par la passerelle.
 * - Pour chaque demande échue (M25, effacements_dus) :
 *     1. fichiers du bucket (fichiers_a_effacer) supprimés par l'API Storage (le SQL direct est interdit) ;
 *     2. lignes : executer_effacement (enfants effacés, rattachements, données sans clé étrangère) ;
 *     3. portée « compte » : suppression du compte Auth (cascade : profil, ajouts, signatures, Aria…),
 *        puis marquer_effacement_execute.
 *   Une étape en échec arrête CETTE demande (elle sera reprise au passage suivant : tout est idempotent).
 * - Puis fichiers orphelins (sans ligne carnet_items, plus d'un jour) supprimés.
 * - Journaux : des compteurs seulement, jamais un identifiant, un nom ou un chemin de fichier.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Comparaison à temps constant (la clé attendue n'est jamais journalisée). */
function egal(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const PAQUET = 100; // l'API Storage supprime par lots

async function supprimerFichiers(admin: ReturnType<typeof createClient>, noms: string[]): Promise<boolean> {
  for (let i = 0; i < noms.length; i += PAQUET) {
    const { error } = await admin.storage.from('carnet').remove(noms.slice(i, i + PAQUET));
    if (error) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ raison: 'methode' }, 405);
  const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const recue = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!egal(recue, cle)) return json({ raison: 'non_autorise' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', cle, { auth: { persistSession: false } });
  const bilan = { dues: 0, executees: 0, echecs: 0, fichiers: 0, orphelins: 0 };

  const { data: dues, error: errDues } = await admin.rpc('effacements_dus');
  if (errDues) return json({ raison: 'lecture_impossible' }, 500);
  bilan.dues = dues?.length ?? 0;

  for (const d of (dues ?? []) as { demande_id: string; portee: 'enfant' | 'compte'; user_id: string }[]) {
    const { data: fichiers, error: errF } = await admin.rpc('fichiers_a_effacer', { p_demande_id: d.demande_id });
    if (errF) { bilan.echecs++; continue; }
    const noms = (fichiers ?? []) as string[];
    if (noms.length && !(await supprimerFichiers(admin, noms))) { bilan.echecs++; continue; }
    bilan.fichiers += noms.length;

    const { error: errX } = await admin.rpc('executer_effacement', { p_demande_id: d.demande_id });
    if (errX) { bilan.echecs++; continue; }

    if (d.portee === 'compte') {
      const { error: errU } = await admin.auth.admin.deleteUser(d.user_id);
      // Compte déjà supprimé (reprise après un échec) : on clôt quand même la demande.
      if (errU && !/not.?found/i.test(errU.message)) { bilan.echecs++; continue; }
      const { error: errM } = await admin.rpc('marquer_effacement_execute', { p_demande_id: d.demande_id });
      if (errM) { bilan.echecs++; continue; }
    }
    bilan.executees++;
  }

  const { data: orphelins } = await admin.rpc('fichiers_orphelins');
  const nomsO = (orphelins ?? []) as string[];
  if (nomsO.length && (await supprimerFichiers(admin, nomsO))) bilan.orphelins = nomsO.length;

  console.log(`effacements : ${bilan.executees}/${bilan.dues} exécutés, ${bilan.echecs} échec(s), ${bilan.fichiers} fichier(s), ${bilan.orphelins} orphelin(s)`);
  return json(bilan);
});
