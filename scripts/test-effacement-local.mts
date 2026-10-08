// Test de bout en bout de l'effacement différé (L7, M25) sur le Supabase LOCAL (jamais la production) :
// A demande l'effacement de Léa (dont un vrai fichier dans le bucket) ; B demande l'effacement de son compte
// (seul responsable de Tom). On avance l'échéance, la fonction « executer-effacements » est appelée avec la
// clé service : Léa + fichier supprimés, compte B + Tom supprimés, fichier orphelin nettoyé. Un appel sans la
// clé service est refusé.
// Prérequis : `npx supabase start` ; M25 appliquée en local ; la fonction servie avec
//   npx supabase functions serve executer-effacements --no-verify-jwt
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
const comptes = { a: `claire-${t}@exemple.test`, b: `marc-${t}@exemple.test` };
const mdp = 'Carnet-test-2026!';
const ids: Record<string, string> = {};
for (const [k, email] of Object.entries(comptes)) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(`création ${k} : ${error.message}`);
  ids[k] = data.user!.id;
}
const session = async (email: string) => {
  const c = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: mdp });
  if (error) throw new Error(error.message);
  return c;
};
const creerEnfant = async (c: Awaited<ReturnType<typeof session>>, prenom: string) => {
  const { data, error } = await c.rpc('create_child', { p_first_name: prenom, p_last_name: 'Test', p_birth_date: null, p_age: 6, p_classe: 'CP', p_school: 'École test' });
  if (error) throw new Error(error.message);
  return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
};

// A : Léa, un vrai fichier + sa ligne ; un fichier orphelin (dépôt sans ligne).
const A = await session(comptes.a);
const lea = await creerEnfant(A, 'Léa');
const zoe = await creerEnfant(A, 'Zoé'); // gardée : son dossier reçoit le fichier orphelin
const { data: ay } = await A.from('academic_years').select('id').eq('student_id', lea).single();
const { data: ayZ } = await A.from('academic_years').select('id').eq('student_id', zoe).single();
const chemin = `${lea}/${ay!.id}/${randomUUID()}.jpg`;
const orphelin = `${zoe}/${ayZ!.id}/${randomUUID()}.jpg`;
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
// Photos (M35, bucket « child-photos ») : Léa (effacée), Zoé (objet SANS photo_path, > 1 jour : orphelin), Mia (gardée, référencée).
const mia = await creerEnfant(A, 'Mia');
const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x01, 0xff, 0xd9]);
const pLea = `${lea}/avatar.jpg`;
const pZoe = `${zoe}/avatar.jpg`;
const pMia = `${mia}/avatar.jpg`;
const upP = await Promise.all([pLea, pZoe, pMia].map((p) => A.storage.from('child-photos').upload(p, photo, { contentType: 'image/jpeg', upsert: true })));
verifier('A dépose 3 photos (Léa, Zoé, Mia)', upP.every((r) => !r.error), upP.find((r) => r.error)?.error?.message ?? '');
for (const [id, p] of [[lea, pLea], [mia, pMia]] as const) {
  const { error } = await A.from('children').update({ photo_path: p }).eq('id', id);
  if (error) throw new Error(error.message);
}
const up1 = await A.storage.from('carnet').upload(chemin, jpeg, { contentType: 'image/jpeg' });
const up2 = await A.storage.from('carnet').upload(orphelin, jpeg, { contentType: 'image/jpeg' });
verifier('A dépose un fichier sous Léa et un orphelin sous Zoé', !up1.error && !up2.error, up1.error?.message ?? up2.error?.message ?? '');
const { error: ciErr } = await A.from('carnet_items').insert({ child_id: lea, categorie: 'souvenir', titre: 'Dessin', fichier: chemin, ajoute_par: ids.a });
verifier('A crée la ligne du carnet', !ciErr, ciErr?.message ?? '');

// B : seul responsable de Tom.
const B = await session(comptes.b);
const tom = await creerEnfant(B, 'Tom');
const pTom = `${tom}/avatar.jpg`;
const upT = await B.storage.from('child-photos').upload(pTom, photo, { contentType: 'image/jpeg', upsert: true });
verifier('B dépose la photo de Tom', !upT.error, upT.error?.message ?? '');
const { error: eT } = await B.from('children').update({ photo_path: pTom }).eq('id', tom);
if (eT) throw new Error(eT.message);

// B est aussi responsable de Zoé (foyer de A) : il y dépose un ajout « foyer » et un ajout privé.
sql(`insert into public.responsables (foyer_id, user_id, child_id, lien)
     select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${zoe}'`);
const fFoyer = `${zoe}/${ayZ!.id}/${randomUUID()}.jpg`;
const fPrive = `${zoe}/${ayZ!.id}/${randomUUID()}.jpg`;
const upB1 = await B.storage.from('carnet').upload(fFoyer, jpeg, { contentType: 'image/jpeg' });
const upB2 = await B.storage.from('carnet').upload(fPrive, jpeg, { contentType: 'image/jpeg' });
const { error: ciB } = await B.from('carnet_items').insert([
  { child_id: zoe, categorie: 'souvenir', titre: 'Photo de Marc', fichier: fFoyer, ajoute_par: ids.b, visibilite: 'foyer' },
  { child_id: zoe, categorie: 'livret', titre: 'Note privée de Marc', fichier: fPrive, ajoute_par: ids.b, visibilite: 'prive' },
]);
verifier('B dépose un ajout « foyer » et un ajout privé sous Zoé', !upB1.error && !upB2.error && !ciB, upB1.error?.message ?? upB2.error?.message ?? ciB?.message ?? '');

// Demandes
const { error: dA } = await A.rpc('demander_effacement_enfant', { p_child_id: lea });
verifier('A demande l’effacement de Léa', !dA, dA?.message ?? '');
const { data: vus } = await A.from('children').select('id').eq('id', lea);
verifier('Léa invisible dès la demande', (vus ?? []).length === 0);
const signe = await A.storage.from('carnet').createSignedUrl(chemin, 60);
verifier('plus d’URL signée pour le fichier de Léa', !!signe.error || !signe.data?.signedUrl);
const { data: apercu } = await B.rpc('apercu_effacement_compte');
verifier('aperçu B : le carnet de Tom serait effacé', Array.isArray(apercu) && apercu.some((e: any) => e.prenom_enfant === 'Tom' && e.carnet_efface));
const { error: dB } = await B.rpc('demander_effacement_compte');
verifier('B demande l’effacement de son compte', !dB, dB?.message ?? '');

const fn = `${API}/functions/v1/executer-effacements`;
// Appel non autorisé (clé publique) : rien ne se passe.
const refus = await fetch(fn, { method: 'POST', headers: { Authorization: `Bearer ${statut.ANON_KEY}` } });
verifier('appel sans la clé service refusé (401)', refus.status === 401, String(refus.status));

// Avant l'échéance : rien à exécuter.
const r0 = await (await fetch(fn, { method: 'POST', headers: { Authorization: `Bearer ${statut.SERVICE_ROLE_KEY}` } })).json();
verifier('avant 30 jours : rien d’exécuté', sql(`select count(*) from public.children where id='${lea}'`) === '1', JSON.stringify(r0));

// Échéance atteinte ; l'orphelin a plus d'un jour.
sql(`update public.demandes_effacement set execution_prevue_le = now() - interval '1 minute' where user_id in ('${ids.a}','${ids.b}') and annulee_le is null;
     set session_replication_role = replica; update storage.objects set created_at = now() - interval '2 days', updated_at = now() - interval '2 days' where name in ('${orphelin}', '${pZoe}', '${pMia}');`);
const r1 = await (await fetch(fn, { method: 'POST', headers: { Authorization: `Bearer ${statut.SERVICE_ROLE_KEY}` } })).json();
verifier('demandes échues exécutées (dont les 2 du test), aucun échec', r1.executees >= 2 && r1.echecs === 0, JSON.stringify(r1));
verifier('Léa effacée', sql(`select count(*) from public.children where id='${lea}'`) === '0');
verifier('fichier de Léa supprimé du bucket', sql(`select count(*) from storage.objects where name = '${chemin}'`) === '0');
verifier('fichier orphelin (Zoé, sans ligne, > 1 jour) nettoyé', r1.orphelins >= 1 && sql(`select count(*) from storage.objects where name = '${orphelin}'`) === '0', JSON.stringify(r1));
verifier('Zoé gardée', sql(`select count(*) from public.children where id='${zoe}'`) === '1');
verifier('compte B supprimé (Auth + profil)', sql(`select count(*) from auth.users where id='${ids.b}'`) === '0' && sql(`select count(*) from public.profiles where id='${ids.b}'`) === '0');
verifier('Tom (seul responsable B) effacé', sql(`select count(*) from public.children where id='${tom}'`) === '0');
verifier('ajout « foyer » de B conservé, sans auteur', sql(`select count(*) from public.carnet_items where fichier = '${fFoyer}' and ajoute_par is null`) === '1');
verifier('ajout privé de B supprimé, fichier compris', sql(`select count(*) from public.carnet_items where fichier = '${fPrive}'`) === '0' && sql(`select count(*) from storage.objects where name = '${fPrive}'`) === '0');
const lienFoyer = await A.storage.from('carnet').createSignedUrl(fFoyer, 60);
verifier('A ouvre encore la photo « foyer » de B', !lienFoyer.error && !!lienFoyer.data?.signedUrl && (await fetch(lienFoyer.data!.signedUrl)).ok, lienFoyer.error?.message ?? '');
verifier('compte A intact', sql(`select count(*) from auth.users where id='${ids.a}'`) === '1');
verifier('registre : 2 demandes exécutées', sql(`select count(*) from public.demandes_effacement where user_id in ('${ids.a}','${ids.b}') and executee_le is not null`) === '2');

// ── Photos d'enfants (M35) : effacement de l'enfant, du compte, orphelins ──
const nb = (n: string) => sql(`select count(*) from storage.objects where bucket_id = 'child-photos' and name = '${n}'`);
verifier('photo de Léa (enfant effacé) supprimée du bucket child-photos', nb(pLea) === '0');
verifier('photo de Tom (enfant seul responsable B, compte effacé) supprimée', nb(pTom) === '0');
verifier('photo orpheline de Zoé (sans photo_path, > 1 jour) nettoyée par l’API de stockage', nb(pZoe) === '0');
verifier('photo de Mia (référencée, enfant gardé) conservée, même vieille', nb(pMia) === '1');
verifier('compteurs : au moins 2 photos comptées avec les fichiers, 1 orpheline', r1.fichiers >= 3 && r1.orphelins >= 2, JSON.stringify(r1));
verifier('plus aucun objet child-photos de Léa ni de Tom', sql(`select count(*) from storage.objects where bucket_id='child-photos' and split_part(name,'/',1) in ('${lea}','${tom}')`) === '0');
const lienMia = await A.storage.from('child-photos').createSignedUrl(pMia, 60);
verifier('A lit encore la photo de Mia par URL signée', !lienMia.error && !!lienMia.data?.signedUrl && (await fetch(lienMia.data!.signedUrl)).ok);
await admin.storage.from('child-photos').remove([pMia]);

// Nettoyage du compte A de test.
await admin.auth.admin.deleteUser(ids.a);
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
