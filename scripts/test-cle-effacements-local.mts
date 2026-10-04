// Test de la vérification de clé de « executer-effacements » sur le Supabase LOCAL (jamais la production).
// Refusés SANS aucune suppression (prouvé par comptage avant/après, sur des données réellement échues) :
//   a. jeton d'un compte parent CONNECTÉ (authenticated) ; b. clé anon (ancienne) et clé publique sb_publishable_ ;
//   c. jeton falsifié (mauvaise signature, rôle service_role revendiqué), expiré (bien signé), altéré (signature
//      d'origine, contenu modifié), chaîne quelconque, en-tête absent.
// Acceptés : d. clé service (ancienne) et clé secrète sb_secret_ → les effacements échus sont exécutés.
// Prérequis : `npx supabase start` ; M25 appliquée en local ; la fonction servie avec
//   npx supabase functions serve executer-effacements --no-verify-jwt
import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(API);
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();
const FN = `${API}/functions/v1/executer-effacements`;

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

// ── Données réelles échues : un compte parent + son enfant (compte à effacer), un fichier orphelin ancien ──
const t = Date.now();
const mdp = 'Carnet-test-2026!';
async function creerParent(prefixe: string) {
  const email = `${prefixe}-${t}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(error.message);
  const c = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: mdp });
  if (e2) throw new Error(e2.message);
  return { id: data.user!.id, client: c, jeton: s.session!.access_token };
}
async function semerEffacementEchu(parent: Awaited<ReturnType<typeof creerParent>>, prenom: string) {
  const { data, error } = await parent.client.rpc('create_child', { p_first_name: prenom, p_last_name: 'Test', p_birth_date: null, p_age: 6, p_classe: 'CP', p_school: 'École test' });
  if (error) throw new Error(error.message);
  const enfant = ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
  const { error: e2 } = await parent.client.rpc('demander_effacement_compte');
  if (e2) throw new Error(e2.message);
  sql(`update public.demandes_effacement set execution_prevue_le = now() - interval '1 minute' where user_id = '${parent.id}' and annulee_le is null and executee_le is null;`);
  return enfant;
}
const compter = () =>
  sql(`select (select count(*) from auth.users) || '|' || (select count(*) from public.profiles) || '|' || (select count(*) from public.children)
       || '|' || (select count(*) from public.responsables) || '|' || (select count(*) from storage.objects where bucket_id = 'carnet')
       || '|' || (select count(*) from public.demandes_effacement where executee_le is not null)
       || '|' || (select count(*) from public.effacements_dus())`);

const A = await creerParent('claire');
const enfantA = await semerEffacementEchu(A, 'Léa');
const B = await creerParent('marc'); // simple parent connecté qui tente l'appel (aucune demande)
// fichier orphelin ancien (sans ligne carnet_items) sous l'enfant d'un compte qui reste
await B.client.rpc('create_child', { p_first_name: 'Tom', p_last_name: 'Test', p_birth_date: null, p_age: 7, p_classe: 'CE1', p_school: 'École test' });
const tom = sql(`select c.id from public.children c join public.responsables r on r.child_id = c.id where r.user_id = '${B.id}'`);
const ayTom = sql(`select id from public.academic_years where student_id = '${tom}'`);
const orphelin = `${tom}/${ayTom}/${randomUUID()}.jpg`;
const up = await B.client.storage.from('carnet').upload(orphelin, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: 'image/jpeg' });
if (up.error) throw new Error(up.error.message);
sql(`update storage.objects set created_at = now() - interval '2 days' where name = '${orphelin}'`);

const avant = compter();
verifier('données échues en place avant les essais (1 effacement dû, 1 fichier orphelin)', /\|1$/.test(avant) && sql(`select count(*) from public.fichiers_orphelins()`) === '1', avant);

// ── Fabrication de jetons ──
const b64 = (o: unknown) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const signer = (payload: object, secret: string) => {
  const tete = b64({ alg: 'HS256', typ: 'JWT' });
  const corps = b64(payload);
  return `${tete}.${corps}.${createHmac('sha256', secret).update(`${tete}.${corps}`).digest('base64url')}`;
};
const maintenant = Math.floor(Date.now() / 1000);
const jetons: [string, string | null][] = [
  ['a. jeton d’un compte parent CONNECTÉ (authenticated)', A.jeton],
  ['a. jeton d’un autre compte parent connecté', B.jeton],
  ['b. clé anon (ancienne, JWT)', statut.ANON_KEY],
  ['b. clé publique sb_publishable_…', statut.PUBLISHABLE_KEY],
  ['c. jeton falsifié : rôle service_role, MAUVAISE signature', signer({ iss: 'supabase-demo', role: 'service_role', exp: maintenant + 3600 }, 'mauvais-secret-de-31-caracteres!!')],
  ['c. jeton EXPIRÉ, bien signé, rôle service_role', signer({ iss: 'supabase-demo', role: 'service_role', exp: maintenant - 3600 }, statut.JWT_SECRET)],
  ['c. jeton ALTÉRÉ : vrai jeton service, contenu modifié (exp), signature d’origine', (() => {
    const [h, , sig] = statut.SERVICE_ROLE_KEY.split('.');
    return `${h}.${b64({ iss: 'supabase-demo', role: 'service_role', exp: maintenant + 999999999 })}.${sig}`;
  })()],
  ['c. chaîne quelconque', 'n-importe-quoi'],
  ['c. en-tête Authorization absent', null],
];
for (const [nom, jeton] of jetons) {
  const r = await fetch(FN, { method: 'POST', headers: jeton === null ? {} : { Authorization: `Bearer ${jeton}` } });
  const apres = compter();
  verifier(`${nom} → refusé (${r.status}) et rien de supprimé`, (r.status === 401 || r.status === 403) && apres === avant, `statut ${r.status}, avant ${avant}, après ${apres}`);
}

// ── d. clé service ancienne : acceptée, l'effacement dû est exécuté ──
const r1 = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${statut.SERVICE_ROLE_KEY}` } });
const j1 = await r1.json().catch(() => ({}));
verifier('d. clé service (ancienne) → acceptée (200), 1 effacement exécuté', r1.status === 200 && j1.executees === 1 && j1.echecs === 0, JSON.stringify(j1));
verifier('   le compte et l’enfant du compte à effacer ont disparu ; le compte qui reste est intact', sql(`select count(*) from auth.users where id = '${A.id}'`) === '0' && sql(`select count(*) from public.children where id = '${enfantA}'`) === '0' && sql(`select count(*) from auth.users where id = '${B.id}'`) === '1');
verifier('   le fichier orphelin ancien est nettoyé', j1.orphelins === 1 && sql(`select count(*) from storage.objects where name = '${orphelin}'`) === '0', JSON.stringify(j1));

// ── d. clé secrète sb_secret_… : acceptée ──
const C = await creerParent('zoe');
const enfantC = await semerEffacementEchu(C, 'Zoé');
const r2 = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${statut.SECRET_KEY}` } });
const j2 = await r2.json().catch(() => ({}));
verifier('d. clé sb_secret_… → acceptée (200), 1 effacement exécuté', r2.status === 200 && j2.executees === 1 && j2.echecs === 0, JSON.stringify(j2));
verifier('   le compte et l’enfant concernés ont disparu', sql(`select count(*) from auth.users where id = '${C.id}'`) === '0' && sql(`select count(*) from public.children where id = '${enfantC}'`) === '0');

await admin.auth.admin.deleteUser(B.id);
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
