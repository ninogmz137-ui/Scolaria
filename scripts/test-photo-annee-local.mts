// Photo PAR ANNÉE (M36, variante A) de bout en bout sur le Supabase LOCAL (jamais la production), par l'API Storage réelle :
// dépôt / remplacement / URL signée d'une photo par année (<enfant>/<année>.jpg), refus (autre foyer, année d'un autre enfant, enseignants
// d'une année active ET d'une année archivée, anonyme, responsable parti, enfant en cours d'effacement), non-fuite du REPLI,
// puis EFFACEMENT d'un enfant : les photos de TOUTES ses années (et l'ancien avatar.jpg) sont supprimées, comptées par l'API de stockage.
// Prérequis : `npx supabase start` ; M36 appliquée en local ; la fonction servie avec
//   npx supabase functions serve executer-effacements --no-verify-jwt
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { choisirPhoto, type LigneAnnee } from '../src/utils/photoAnnee.ts';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
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
const comptes = { a: `claire-${t}@exemple.test`, b: `marc-${t}@exemple.test`, c: `zoe-${t}@exemple.test`, d: `prof1-${t}@exemple.test`, e: `prof2-${t}@exemple.test` };
const mdp = 'Carnet-test-2026!';
const ids: Record<string, string> = {};
for (const [k, email] of Object.entries(comptes)) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(`création ${k} : ${error.message}`);
  ids[k] = data.user!.id;
}
type Client = ReturnType<typeof createClient>;
const session = async (email: string): Promise<Client> => {
  const c = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: mdp });
  if (error) throw new Error(error.message);
  return c;
};
const creerEnfant = async (c: Client, prenom: string) => {
  const { data, error } = await c.rpc('create_child', { p_first_name: prenom, p_last_name: 'Test', p_birth_date: null, p_age: 10, p_classe: 'CM2', p_school: 'École test' });
  if (error) throw new Error(error.message);
  return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
};
const anneeActive = (enfant: string) => sql(`select id from public.academic_years where student_id = '${enfant}' and statut = 'active'`);
/** Années précédentes (N−1, N−2, …) créées par le serveur : renvoie leurs identifiants, de la plus récente à la plus ancienne. */
function anneesPrecedentes(enfant: string, n: number): string[] {
  const m = sql(`select annee_scolaire from public.academic_years where student_id = '${enfant}' and statut = 'active'`);
  const debut = Number(m.slice(0, 4));
  const r: string[] = [];
  for (let i = 1; i <= n; i++) {
    r.push(sql(`insert into public.academic_years (student_id, annee_scolaire, niveau, etablissement, statut)
      values ('${enfant}', '${debut - i}-${debut - i + 1}', 'CM1', 'École test', 'archivée') returning id`).split('\n')[0]);
  }
  return r;
}
const jpeg = (n: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, n, 0xaa, n, 0xff, 0xd9]);
const memes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const lire = async (c: Client, chemin: string): Promise<Uint8Array | null> => {
  const l = await c.storage.from('child-photos').createSignedUrl(chemin, 3600);
  if (l.error || !l.data?.signedUrl) return null;
  return new Uint8Array(await (await fetch(l.data.signedUrl)).arrayBuffer());
};
const nbObjets = (nom: string) => Number(sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${nom}'`));
/** Nombre d'objets d'un dossier d'enfant, COMPTÉS PAR L'API de stockage (pas par SQL). */
const compterApi = async (enfant: string) => {
  const { data, error } = await admin.storage.from('child-photos').list(enfant, { limit: 100 });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((o) => o.name && o.id).length;
};
/** Dépose la photo d'une année (upsert) et écrit academic_years.photo_path, comme l'app. */
async function poserPhoto(c: Client, enfant: string, annee: string, octets: Uint8Array) {
  const chemin = `${enfant}/${annee}.jpg`;
  const up = await c.storage.from('child-photos').upload(chemin, octets, { contentType: 'image/jpeg', upsert: true });
  const { error } = await c.from('academic_years').update({ photo_path: chemin }).eq('id', annee);
  return { chemin, erreur: up.error?.message ?? error?.message ?? null };
}
const enfantsCrees: string[] = [];

try {
  const A = await session(comptes.a);
  const B = await session(comptes.b);
  const C = await session(comptes.c);
  const D = await session(comptes.d);
  const E = await session(comptes.e);
  const anon = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const bucket = (c: Client) => c.storage.from('child-photos');

  // ── Lucas : 3 années (active + N−1 + N−2) ; D = titulaire de la classe de l'année ACTIVE, E = d'une classe rattachée à N−1 (ARCHIVÉE) ──
  const lucas = await creerEnfant(A, 'Lucas');
  enfantsCrees.push(lucas);
  const zoe = await creerEnfant(C, 'Zoé');
  enfantsCrees.push(zoe);
  sql(`insert into public.responsables (foyer_id, user_id, child_id, lien) select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${lucas}'`);
  const y0 = anneeActive(lucas);
  const [y1, y2] = anneesPrecedentes(lucas, 2);
  const yz = anneeActive(zoe);
  const ecole = sql(`insert into public.ecoles (nom) values ('École test') returning id`).split('\n')[0];
  const cl1 = sql(`insert into public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
    select '${ecole}', annee_scolaire, 'CM2', 'CM2 B', '${ids.d}' from public.academic_years where id = '${y0}' returning id`).split('\n')[0];
  const cl2 = sql(`insert into public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
    select '${ecole}', annee_scolaire, 'CM1', 'CM1 A', '${ids.e}' from public.academic_years where id = '${y1}' returning id`).split('\n')[0];
  sql(`update public.academic_years set classe_id = '${cl1}' where id = '${y0}'; update public.academic_years set classe_id = '${cl2}' where id = '${y1}';`);

  // 1. A pose une photo par année, lecture par URL signée d'1 h, jamais publique.
  const octets = [jpeg(1), jpeg(2), jpeg(3)];
  const annees = [y0, y1, y2];
  for (let i = 0; i < 3; i++) {
    const r = await poserPhoto(A, lucas, annees[i], octets[i]);
    verifier(`A dépose la photo de l'année ${i === 0 ? 'ACTIVE' : i === 1 ? 'N−1' : 'N−2'} de Lucas`, !r.erreur, r.erreur ?? '');
  }
  verifier('3 objets (un par année) pour Lucas, comptés par l\'API', (await compterApi(lucas)) === 3);
  for (let i = 0; i < 3; i++) {
    const lu = await lire(A, `${lucas}/${annees[i]}.jpg`);
    verifier(`URL signée : la photo de l'année ${i} se lit, octets identiques`, !!lu && memes(lu, octets[i]));
  }
  const publique = await fetch(`${API}/storage/v1/object/public/child-photos/${lucas}/${y1}.jpg`);
  verifier('aucune URL publique (bucket privé)', !publique.ok, String(publique.status));
  const { data: lignes } = await A.from('academic_years').select('id, photo_path').eq('student_id', lucas).not('photo_path', 'is', null);
  verifier('A lit les 3 références photo_path (requête de repli de l\'app)', (lignes ?? []).length === 3);

  // 2. B (co-responsable) lit et REMPLACE la photo d'une année précédente posée par A.
  const nouveau = jpeg(9);
  const upB = await bucket(B).upload(`${lucas}/${y1}.jpg`, nouveau, { contentType: 'image/jpeg', upsert: true });
  verifier('B remplace la photo de N−1 posée par A (upsert)', !upB.error, upB.error?.message ?? '');
  const apresB = await lire(A, `${lucas}/${y1}.jpg`);
  verifier('A voit la photo de N−1 remplacée par B', !!apresB && memes(apresB, nouveau));

  // 3. Verrous d'année : photo_path modifiable sur une année ARCHIVÉE rattachée à une classe et sur l'année ACTIVE rattachée à une classe.
  const { error: raz1 } = await A.from('academic_years').update({ photo_path: null }).eq('id', y1);
  const { error: re1 } = await A.from('academic_years').update({ photo_path: `${lucas}/${y1}.jpg` }).eq('id', y1);
  const { error: raz0 } = await A.from('academic_years').update({ photo_path: null }).eq('id', y0);
  const { error: re0 } = await A.from('academic_years').update({ photo_path: `${lucas}/${y0}.jpg` }).eq('id', y0);
  verifier('A efface puis repose photo_path : année archivée rattachée à une classe ET année active rattachée', !raz1 && !re1 && !raz0 && !re0, [raz1, re1, raz0, re0].map((e) => e?.message).filter(Boolean).join(' | '));

  // 3 bis. Le MÊME calcul que l'app (requête sous RLS puis choisirPhoto) contre la vraie base : année en cours, repli N−1, jamais N−2.
  const lignesApp = async (c: Client, enfant: string) =>
    ((await c.from('academic_years').select('id, student_id, annee_scolaire, statut, photo_path, updated_at').in('student_id', [enfant])).data ?? []) as unknown as LigneAnnee[];
  let choix = choisirPhoto(await lignesApp(A, lucas));
  verifier('app : photo de l’année en cours affichée, sans signe', choix.chemin === `${lucas}/${y0}.jpg` && choix.anterieure === null && choix.deCetteAnnee);
  await A.from('academic_years').update({ photo_path: null }).eq('id', y0);
  choix = choisirPhoto(await lignesApp(A, lucas));
  verifier('app : année en cours sans photo → REPLI sur N−1 avec signe, l’écriture vise l’année en cours', choix.chemin === `${lucas}/${y1}.jpg` && !!choix.anterieure && choix.anneeActiveId === y0 && !choix.deCetteAnnee, JSON.stringify(choix));
  verifier('app : la photo de repli (N−1) se lit pour un responsable', !!(await lire(A, choix.chemin!)));
  await A.from('academic_years').update({ photo_path: null }).eq('id', y1);
  choix = choisirPhoto(await lignesApp(A, lucas));
  verifier('app : N−1 sans photo mais N−2 photographiée → AUCUN repli (jamais au-delà de N−1)', choix.chemin === null && choix.anterieure === null, JSON.stringify(choix));
  const { error: rest1 } = await A.from('academic_years').update({ photo_path: `${lucas}/${y1}.jpg` }).eq('id', y1);
  const { error: rest0 } = await A.from('academic_years').update({ photo_path: `${lucas}/${y0}.jpg` }).eq('id', y0);
  verifier('les références des années sont remises en place pour la suite', !rest1 && !rest0);

  // 4. Refus : année d'un autre enfant, chemin libre, autre foyer.
  const horsAnnee = await bucket(A).upload(`${lucas}/${yz}.jpg`, jpeg(4), { contentType: 'image/jpeg' });
  verifier('A : année d\'un AUTRE enfant sous le dossier de Lucas refusée', !!horsAnnee.error);
  const horsEnfant = await bucket(A).upload(`${zoe}/${yz}.jpg`, jpeg(4), { contentType: 'image/jpeg' });
  verifier('A : photo de l\'enfant d\'un autre foyer refusée', !!horsEnfant.error);
  const libre = await bucket(A).upload(`${lucas}/portrait.jpg`, jpeg(4), { contentType: 'image/jpeg' });
  verifier('un nom libre est refusé', !!libre.error);
  const inconnue = await bucket(A).upload(`${lucas}/${crypto.randomUUID()}.jpg`, jpeg(4), { contentType: 'image/jpeg' });
  verifier('une année qui n\'existe pas est refusée', !!inconnue.error);
  const { error: cc } = await A.from('academic_years').update({ photo_path: `${lucas}/${y1}.jpg` }).eq('id', y0);
  verifier('photo_path d\'une AUTRE année du même enfant refusé (contrainte)', !!cc);
  const { error: cz } = await A.from('academic_years').update({ photo_path: `${lucas}/${yz}.jpg` }).eq('id', y0);
  verifier('photo_path de l\'année d\'un AUTRE enfant refusé (contrainte)', !!cz);
  const png = await bucket(A).upload(`${lucas}/${y2}.jpg`, jpeg(4), { contentType: 'image/png', upsert: true });
  verifier('un PNG est refusé (JPEG seulement)', !!png.error);
  const gros = new Uint8Array(1048577);
  gros[0] = 0xff;
  gros[1] = 0xd8;
  const trop = await bucket(A).upload(`${lucas}/${y2}.jpg`, gros, { contentType: 'image/jpeg', upsert: true });
  verifier('plus d\'1 Mo est refusé', !!trop.error);

  // 5. Autre foyer (C), enseignants (D : année ACTIVE ; E : année ARCHIVÉE), anonyme : AUCUNE photo d'AUCUNE année, même sans partage.
  const chemins = [`${lucas}/${y0}.jpg`, `${lucas}/${y1}.jpg`, `${lucas}/${y2}.jpg`];
  for (const [qui, cl] of [['C (autre foyer)', C], ['D (enseignant, année ACTIVE)', D], ['E (enseignant, année ARCHIVÉE)', E], ['anonyme', anon]] as const) {
    let lisible = 0;
    let ecrit = 0;
    for (const p of chemins) {
      const l = await cl.storage.from('child-photos').createSignedUrl(p, 60);
      if (!l.error && l.data?.signedUrl) lisible++;
      const dl = await cl.storage.from('child-photos').download(p);
      if (!dl.error) lisible++;
      const up = await cl.storage.from('child-photos').upload(p, jpeg(7), { contentType: 'image/jpeg', upsert: true });
      if (!up.error) ecrit++;
      await cl.storage.from('child-photos').remove([p]);
    }
    verifier(`${qui} : aucune photo lisible (3 années × URL signée et téléchargement)`, lisible === 0, `${lisible} lecture(s)`);
    verifier(`${qui} : aucun remplacement, aucune suppression (les 3 objets existent, octets d'origine)`, ecrit === 0 && (await compterApi(lucas)) === 3 && (await lire(A, chemins[0])) !== null && memes((await lire(A, chemins[0]))!, octets[0]));
    const { data: vu } = await cl.from('academic_years').select('id, photo_path').eq('student_id', lucas);
    verifier(`${qui} : ne voit aucune ligne d'année de Lucas (donc aucun chemin de photo)`, (vu ?? []).length === 0);
    const { data: mod } = await cl.from('academic_years').update({ photo_path: null }).eq('student_id', lucas).select('id');
    verifier(`${qui} : ne peut pas effacer photo_path`, (mod ?? []).length === 0 && sql(`select count(*) from public.academic_years where student_id='${lucas}' and photo_path is not null`) === '3');
  }

  // 6. NON-FUITE, repli compris : un responsable DÉTACHÉ du carnet (quitter_carnet).
  const mila = await creerEnfant(A, 'Mila');
  enfantsCrees.push(mila);
  sql(`insert into public.responsables (foyer_id, user_id, child_id, lien) select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${mila}'`);
  const m0 = anneeActive(mila);
  const [m1] = anneesPrecedentes(mila, 1);
  await poserPhoto(A, mila, m0, jpeg(21));
  await poserPhoto(A, mila, m1, jpeg(22));
  const repliB = async () => (await B.from('academic_years').select('id, annee_scolaire, photo_path').eq('student_id', mila).not('photo_path', 'is', null)).data ?? [];
  verifier('B (encore responsable) lit les 2 années de Mila et leur repli', (await repliB()).length === 2 && !!(await lire(B, `${mila}/${m0}.jpg`)) && !!(await lire(B, `${mila}/${m1}.jpg`)));
  const { error: depart } = await B.rpc('quitter_carnet', { p_child_id: mila });
  verifier('B quitte le carnet de Mila (quitter_carnet)', !depart, depart?.message ?? '');
  verifier('B parti : le REPLI ne renvoie ni année ni chemin', (await repliB()).length === 0);
  verifier('B parti : le calcul de l’app (choisirPhoto) n’affiche aucune photo, ni de cette année ni de N−1', choisirPhoto(await lignesApp(B, mila)).chemin === null);
  verifier('B parti : AUCUNE photo d\'aucune année lisible', (await lire(B, `${mila}/${m0}.jpg`)) === null && (await lire(B, `${mila}/${m1}.jpg`)) === null);
  const dlB = await B.storage.from('child-photos').download(`${mila}/${m1}.jpg`);
  const upB2 = await B.storage.from('child-photos').upload(`${mila}/${m1}.jpg`, jpeg(23), { contentType: 'image/jpeg', upsert: true });
  await B.storage.from('child-photos').remove([`${mila}/${m0}.jpg`, `${mila}/${m1}.jpg`]);
  verifier('B parti : téléchargement, remplacement refusés ; suppression sans effet', !!dlB.error && !!upB2.error && (await compterApi(mila)) === 2);
  verifier('A (resté responsable) lit encore les 2 années', !!(await lire(A, `${mila}/${m0}.jpg`)) && !!(await lire(A, `${mila}/${m1}.jpg`)));

  // 7. NON-FUITE : enfant EN COURS D'EFFACEMENT (son unique responsable), repli compris.
  const noe = await creerEnfant(A, 'Noé');
  enfantsCrees.push(noe);
  const n0 = anneeActive(noe);
  const [n1] = anneesPrecedentes(noe, 1);
  await poserPhoto(A, noe, n0, jpeg(31));
  await poserPhoto(A, noe, n1, jpeg(32));
  const { error: dem } = await A.rpc('demander_effacement_enfant', { p_child_id: noe });
  verifier('A demande l\'effacement de Noé (30 jours)', !dem, dem?.message ?? '');
  verifier('Noé en cours d\'effacement : AUCUNE photo d\'aucune année lisible', (await lire(A, `${noe}/${n0}.jpg`)) === null && (await lire(A, `${noe}/${n1}.jpg`)) === null);
  const { data: repliN } = await A.from('academic_years').select('id, photo_path').eq('student_id', noe);
  verifier('Noé en cours d\'effacement : le REPLI ne renvoie rien', (repliN ?? []).length === 0);
  const upN = await A.storage.from('child-photos').upload(`${noe}/${n1}.jpg`, jpeg(33), { contentType: 'image/jpeg', upsert: true });
  await A.storage.from('child-photos').remove([`${noe}/${n0}.jpg`]);
  verifier('Noé en cours d\'effacement : remplacement refusé, suppression sans effet', !!upN.error && (await compterApi(noe)) === 2);

  // 8. EFFACEMENT d'un enfant : les photos de TOUTES ses années (+ l'ancien avatar.jpg) sont supprimées, comptées par l'API de stockage.
  const remi = await creerEnfant(A, 'Rémi');
  enfantsCrees.push(remi);
  const r0 = anneeActive(remi);
  const [r1, r2] = anneesPrecedentes(remi, 2);
  for (const [y, n] of [[r0, 41], [r1, 42], [r2, 43]] as const) await poserPhoto(A, remi, y, jpeg(n));
  const vieux = await bucket(A).upload(`${remi}/avatar.jpg`, jpeg(44), { contentType: 'image/jpeg', upsert: true }); // chemin de transition (M35)
  verifier('A dépose aussi l\'ancien avatar.jpg de Rémi (transition)', !vieux.error, vieux.error?.message ?? '');
  verifier('AVANT effacement : 4 objets pour Rémi (3 années + avatar), comptés par l\'API', (await compterApi(remi)) === 4);
  const avantMila = await compterApi(mila);
  const avantLucas = await compterApi(lucas);
  const { error: demR } = await A.rpc('demander_effacement_enfant', { p_child_id: remi });
  verifier('A demande l\'effacement de Rémi', !demR, demR?.message ?? '');
  sql(`update public.demandes_effacement set execution_prevue_le = now() - interval '1 minute' where user_id = '${ids.a}' and annulee_le is null and executee_le is null`);
  const fn = `${API}/functions/v1/executer-effacements`;
  const r = await (await fetch(fn, { method: 'POST', headers: { Authorization: `Bearer ${statut.SERVICE_ROLE_KEY}` } })).json();
  verifier('demandes échues exécutées (Noé et Rémi), aucun échec', r.executees >= 2 && r.echecs === 0, JSON.stringify(r));
  verifier('Rémi effacé (ligne, années)', sql(`select count(*) from public.children where id='${remi}'`) === '0' && sql(`select count(*) from public.academic_years where student_id='${remi}'`) === '0');
  verifier('APRÈS effacement : 0 objet pour Rémi (3 années + avatar), compté par l\'API de stockage', (await compterApi(remi)) === 0);
  verifier('APRÈS effacement : 0 objet pour Noé (2 années), compté par l\'API de stockage', (await compterApi(noe)) === 0);
  verifier('compteur de fichiers : au moins 6 photos supprimées (4 de Rémi + 2 de Noé)', r.fichiers >= 6, JSON.stringify(r));
  verifier('les photos des autres enfants sont intactes (Mila, Lucas)', (await compterApi(mila)) === avantMila && (await compterApi(lucas)) === avantLucas);
  verifier('A lit encore la photo de l\'année active de Lucas', !!(await lire(A, `${lucas}/${y0}.jpg`)));
} finally {
  // Nettoyage : objets par l'API Storage (jamais en SQL), enfants, comptes.
  for (const e of enfantsCrees) {
    const { data } = await admin.storage.from('child-photos').list(e, { limit: 100 });
    const noms = (data ?? []).filter((o) => o.name && o.id).map((o) => `${e}/${o.name}`);
    if (noms.length) await admin.storage.from('child-photos').remove(noms);
  }
  sql(`delete from public.demandes_effacement where user_id in ('${ids.a}','${ids.b}','${ids.c}','${ids.d}','${ids.e}')`);
  sql(`delete from public.children where id in (select child_id from public.responsables where user_id in ('${ids.a}','${ids.b}','${ids.c}'))`);
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
}
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) sur ${ok + echecs} ──`);
process.exitCode = echecs === 0 ? 0 : 1;
