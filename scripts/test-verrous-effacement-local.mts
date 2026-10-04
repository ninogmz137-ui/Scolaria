// PREUVE 1 de la validation de M30 : les verrous A9 à A12 (agenda_events.parent_id, children.parent_id / scolaria_id,
// foyers.created_by) laissent passer le serveur ET les fonctions SECURITY DEFINER, par le VRAI chemin (Edge Function
// « executer-effacements » avec la clé service) sur le Supabase LOCAL (jamais la production).
//   Cas 1 : compte supprimé qui a créé un événement d'agenda PARTAGÉ → événement conservé, auteur anonymisé (NULL).
//   Cas 2 : compte supprimé, créateur d'un enfant qui a un AUTRE responsable → l'enfant est rattaché à cet autre responsable.
//   Cas 3 : compte supprimé, créateur d'un foyer → foyer conservé (l'autre responsable y reste), créateur NULL.
//   Cas 4 : départ d'un responsable via quitter_carnet, créateur de l'enfant ET du foyer ET d'un événement → départ accepté,
//           aucun verrou ne se déclenche, l'événement reste, l'autre responsable continue d'écrire.
//   Contre-épreuve : depuis l'app (jeton d'un compte), modifier ces champs reste REFUSÉ.
// Prérequis : `npx supabase start` ; migrations appliquées ; fonction servie :
//   npx supabase functions serve executer-effacements --no-verify-jwt
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(API);
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();
let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const t = Date.now();
const mdp = 'Verrous-test-2026!';
async function parent(prefixe: string) {
  const email = `${prefixe}-${t}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(error.message);
  const client = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: mdp });
  if (e2) throw new Error(e2.message);
  return { id: data.user.id, email, client };
}
type P = Awaited<ReturnType<typeof parent>>;
async function enfant(p: P, prenom: string) {
  const { data, error } = await p.client.rpc('create_child', { p_first_name: prenom, p_last_name: 'Test', p_birth_date: null, p_age: 8, p_classe: 'CE2', p_school: 'École test' });
  if (error) throw new Error(error.message);
  return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
}
/** Invite puis fait accepter : le chemin légitime pour obtenir un second responsable. */
async function inviter(createur: P, invite: P, child: string) {
  const { error } = await createur.client.from('invitations_responsable').insert({ child_id: child, invited_by: createur.id, invited_email: invite.email });
  if (error) throw new Error(error.message);
  const { data: recues } = await invite.client.rpc('mes_invitations');
  const { data, error: e2 } = await invite.client.rpc('respond_invitation', { p_invitation_id: (recues as any[])[0].invitation_id, p_accept: true });
  if (e2 || data !== 'acceptee') throw new Error(`acceptation : ${e2?.message ?? data}`);
}
const evenement = async (p: P, child: string, titre: string) => {
  const { data, error } = await p.client.from('agenda_events').insert({ child_id: child, parent_id: p.id, title: titre, event_type: 'reunion', start_time: new Date(Date.now() + 86400000).toISOString() }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
};
const FN = `${API}/functions/v1/executer-effacements`;

// ═══ Cas 1 · 2 · 3 : suppression d'un COMPTE créateur (chemin réel : Edge Function + clé service) ═══
const A = await parent('createur');
const B = await parent('autre');
const emma = await enfant(A, 'Emma');
const foyerEmma = sql(`select foyer_id from public.responsables where child_id = '${emma}' limit 1`);
verifier('départ : A est créateur de l’enfant et du foyer', sql(`select parent_id from public.children where id = '${emma}'`) === A.id && sql(`select created_by from public.foyers where id = '${foyerEmma}'`) === A.id);
await inviter(A, B, emma);
const evA = await evenement(A, emma, 'Réunion parents (créée par A)');
verifier('départ : B est responsable, l’événement de A est visible de B', ((await B.client.from('agenda_events').select('id').eq('id', evA)).data ?? []).length === 1);

const { error: dem } = await A.client.rpc('demander_effacement_compte');
verifier('A demande l’effacement de son compte', !dem, dem?.message ?? '');
sql(`update public.demandes_effacement set execution_prevue_le = now() - interval '1 minute' where user_id = '${A.id}' and annulee_le is null and executee_le is null`);
const r = await (await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${statut.SERVICE_ROLE_KEY}` } })).json();
verifier('exécution par la clé service : demande exécutée, aucun échec', r.executees >= 1 && r.echecs === 0, JSON.stringify(r));
verifier('compte A supprimé (Auth + profil)', sql(`select count(*) from auth.users where id = '${A.id}'`) === '0' && sql(`select count(*) from public.profiles where id = '${A.id}'`) === '0');
verifier('CAS 1 · événement d’agenda partagé conservé, auteur anonymisé (NULL)', sql(`select count(*) from public.agenda_events where id = '${evA}' and parent_id is null`) === '1');
verifier('CAS 2 · Emma conservée, rattachée à l’autre responsable (B)', sql(`select parent_id from public.children where id = '${emma}'`) === B.id, sql(`select coalesce(parent_id::text, 'NULL') from public.children where id = '${emma}'`));
verifier('CAS 3 · foyer conservé, créateur NULL, B toujours dedans', sql(`select count(*) from public.foyers where id = '${foyerEmma}' and created_by is null`) === '1' && sql(`select count(*) from public.responsables where foyer_id = '${foyerEmma}' and user_id = '${B.id}'`) === '1');
verifier('B lit toujours Emma et l’événement conservé', ((await B.client.from('children').select('id').eq('id', emma)).data ?? []).length === 1 && ((await B.client.from('agenda_events').select('id').eq('id', evA)).data ?? []).length === 1);

// ═══ Cas 4 : départ d'un responsable via quitter_carnet (créateur de tout) ═══
const C = await parent('quitte');
const D = await parent('reste');
const tom = await enfant(C, 'Tom');
const foyerTom = sql(`select foyer_id from public.responsables where child_id = '${tom}' limit 1`);
await inviter(C, D, tom);
const evC = await evenement(C, tom, 'Piscine (créée par C)');
const { error: dep } = await C.client.rpc('quitter_carnet', { p_child_id: tom });
verifier('CAS 4 · C (créateur de l’enfant, du foyer et d’un événement) quitte le carnet : accepté', !dep, dep?.message ?? '');
verifier('CAS 4 bis · C n’est plus responsable', sql(`select count(*) from public.responsables where user_id = '${C.id}' and child_id = '${tom}'`) === '0');
verifier('CAS 4 ter · l’événement reste (agenda partagé), l’enfant et le foyer sont intacts', sql(`select count(*) from public.agenda_events where id = '${evC}'`) === '1' && sql(`select count(*) from public.children where id = '${tom}'`) === '1' && sql(`select count(*) from public.foyers where id = '${foyerTom}'`) === '1');
const evD = await evenement(D, tom, 'Dentiste (créé par D)').catch((e) => String(e));
verifier('CAS 4 quater · D continue d’écrire dans l’agenda', /^[0-9a-f-]{36}$/.test(evD), evD);
verifier('CAS 4 quinquies · D voit toujours l’événement de C', ((await D.client.from('agenda_events').select('id').eq('id', evC)).data ?? []).length === 1);

// ═══ Contre-épreuve : depuis l'app, ces champs restent verrouillés ═══
{
  const { error: e1 } = await D.client.from('children').update({ parent_id: D.id }).eq('id', tom);
  verifier('app : children.parent_id non modifiable', e1?.code === '42501', e1?.message ?? 'aucune erreur');
  const { error: e2 } = await D.client.from('children').update({ scolaria_id: 'SCA-PIRATE' }).eq('id', tom);
  verifier('app : children.scolaria_id non modifiable', e2?.code === '42501', e2?.message ?? 'aucune erreur');
  const { error: e3 } = await D.client.from('agenda_events').update({ parent_id: D.id }).eq('id', evC);
  verifier('app : agenda_events.parent_id non modifiable (usurpation d’auteur)', e3?.code === '42501', e3?.message ?? 'aucune erreur');
  const { error: e4 } = await D.client.from('foyers').update({ created_by: D.id }).eq('id', foyerTom);
  verifier('app : foyers.created_by non modifiable', e4?.code === '42501', e4?.message ?? 'aucune erreur');
}

console.log(`\n${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
