// Photo de l'enfant (M35) de bout en bout sur le Supabase LOCAL (jamais la production), par l'API Storage réelle :
// dépôt / remplacement (upsert) par deux responsables, URL signée d'1 h, bucket privé, refus pour un autre foyer,
// types et poids refusés, suppression. (Le ré-encodage 512×512 et l'EXIF sont faits sur l'appareil : voir test:photo-enfant.)
// Prérequis : `npx supabase start` ; M35 appliquée en local.
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
const comptes = { a: `claire-${t}@exemple.test`, b: `marc-${t}@exemple.test`, c: `zoe-${t}@exemple.test`, d: `prof-${t}@exemple.test` };
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

// Deux « photos » JPEG minimales distinctes (octets valides pour le type ; le décodage n'est pas testé ici).
const jpeg1 = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x01, 0xff, 0xd9]);
const jpeg2 = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x02, 0xaa, 0xbb, 0xff, 0xd9]);

try {
  const A = await session(comptes.a);
  const B = await session(comptes.b);
  const C = await session(comptes.c);
  const T = await session(comptes.d);
  const lucas = await creerEnfant(A, 'Lucas');
  const zoe = await creerEnfant(C, 'Zoé');
  // B : 2e responsable de Lucas (rattachement par le serveur dans le test ; en vrai : invitation acceptée).
  sql(`insert into public.responsables (foyer_id, user_id, child_id, lien)
       select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${lucas}'`);
  const chemin = `${lucas}/avatar.jpg`;
  // D : enseignant titulaire de la classe de Lucas (rattachement fait par le serveur).
  const ay = sql(`select id from public.academic_years where student_id = '${lucas}'`);
  const ecole = sql(`insert into public.ecoles (nom) values ('École test') returning id`).split('\n')[0];
  const classe = sql(`insert into public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
    select '${ecole}', annee_scolaire, 'CP', 'CP A', '${ids.d}' from public.academic_years where id = '${ay}' returning id`).split('\n')[0];
  sql(`update public.academic_years set classe_id = '${classe}' where id = '${ay}'`);

  // 1. A dépose la photo, puis écrit photo_path.
  const up1 = await A.storage.from('child-photos').upload(chemin, jpeg1, { contentType: 'image/jpeg', upsert: true });
  verifier('A dépose la photo de Lucas (upsert)', !up1.error, up1.error?.message ?? '');
  const { error: majA } = await A.from('children').update({ photo_path: chemin }).eq('id', lucas);
  verifier('A écrit children.photo_path', !majA, majA?.message ?? '');

  // 2. Lecture par URL signée d'1 h ; jamais d'URL publique.
  const lien = await A.storage.from('child-photos').createSignedUrl(chemin, 3600);
  const lu = lien.data?.signedUrl ? new Uint8Array(await (await fetch(lien.data.signedUrl)).arrayBuffer()) : new Uint8Array();
  verifier('URL signée : la photo se lit, octets identiques', !lien.error && lu.length === jpeg1.length && lu.every((v, i) => v === jpeg1[i]), lien.error?.message ?? '');
  const publique = await fetch(`${API}/storage/v1/object/public/child-photos/${chemin}`);
  verifier('aucune URL publique : le bucket est privé', !publique.ok, String(publique.status));

  // 3. B (co-responsable) lit, REMPLACE (upsert sur un objet posé par A), puis A voit la nouvelle version.
  const lienB = await B.storage.from('child-photos').createSignedUrl(chemin, 3600);
  verifier('B (co-responsable) obtient une URL signée', !lienB.error && !!lienB.data?.signedUrl, lienB.error?.message ?? '');
  const up2 = await B.storage.from('child-photos').upload(chemin, jpeg2, { contentType: 'image/jpeg', upsert: true });
  verifier('B remplace la photo posée par A (upsert)', !up2.error, up2.error?.message ?? '');
  const lien2 = await A.storage.from('child-photos').createSignedUrl(chemin, 3600);
  const lu2 = lien2.data?.signedUrl ? new Uint8Array(await (await fetch(lien2.data.signedUrl)).arrayBuffer()) : new Uint8Array();
  verifier('A voit la photo remplacée par B', lu2.length === jpeg2.length && lu2.every((v, i) => v === jpeg2[i]));
  verifier('un seul objet pour Lucas dans le bucket', sql(`select count(*) from storage.objects where bucket_id='child-photos' and name like '${lucas}/%'`) === '1');

  // 4. Un autre foyer (C) : rien.
  const lienC = await C.storage.from('child-photos').createSignedUrl(chemin, 60);
  verifier('C (autre foyer) : pas d’URL signée', !!lienC.error || !lienC.data?.signedUrl);
  const dlC = await C.storage.from('child-photos').download(chemin);
  verifier('C (autre foyer) : lecture refusée', !!dlC.error);
  const upC = await C.storage.from('child-photos').upload(chemin, jpeg2, { contentType: 'image/jpeg', upsert: true });
  verifier('C : remplacement de la photo de Lucas refusé', !!upC.error);
  const upC2 = await C.storage.from('child-photos').upload(`${lucas}/autre.jpg`, jpeg2, { contentType: 'image/jpeg' });
  verifier('C : dépôt sous Lucas refusé', !!upC2.error);
  await C.storage.from('child-photos').remove([chemin]);
  verifier('C : suppression sans effet (la photo existe toujours)', sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${chemin}'`) === '1');
  const { error: majC } = await C.from('children').update({ photo_path: null }).eq('id', lucas);
  verifier('C : ne peut pas modifier children.photo_path de Lucas', sql(`select photo_path is not null from public.children where id='${lucas}'`) === 't', majC?.message ?? '');
  const { data: pasLa } = await C.from('children').select('id, photo_path').eq('id', lucas);
  verifier('C : ne voit même pas la ligne de Lucas', (pasLa ?? []).length === 0);

  // 4 bis. Enseignant titulaire de la classe ET anonyme : lecture, écriture, suppression refusées.
  const anon = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  for (const [qui, cl] of [['enseignant', T], ['anonyme', anon]] as const) {
    const lien = await cl.storage.from('child-photos').createSignedUrl(chemin, 60);
    verifier(`${qui} : pas d’URL signée`, !!lien.error || !lien.data?.signedUrl);
    const dl = await cl.storage.from('child-photos').download(chemin);
    verifier(`${qui} : lecture refusée`, !!dl.error);
    const up = await cl.storage.from('child-photos').upload(chemin, jpeg2, { contentType: 'image/jpeg', upsert: true });
    verifier(`${qui} : remplacement refusé`, !!up.error);
    const neuf = await cl.storage.from('child-photos').upload(`${lucas}/autre.jpg`, jpeg2, { contentType: 'image/jpeg' });
    verifier(`${qui} : dépôt refusé`, !!neuf.error);
    await cl.storage.from('child-photos').remove([chemin]);
    verifier(`${qui} : suppression sans effet (la photo existe toujours)`, sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${chemin}'`) === '1');
  }
  const { data: vuT } = await T.from('children').select('id, photo_path').eq('id', lucas);
  verifier('enseignant : ne voit pas photo_path de Lucas (aucune lecture école)', (vuT ?? []).every((r: any) => !r.photo_path));

  // 5. Types et poids : JPEG seulement, 1 Mo au plus ; chemin libre refusé.
  const png = await A.storage.from('child-photos').upload(chemin, jpeg1, { contentType: 'image/png', upsert: true });
  verifier('un PNG est refusé (JPEG seulement)', !!png.error);
  const gros = new Uint8Array(1048577);
  gros[0] = 0xff; gros[1] = 0xd8;
  const trop = await A.storage.from('child-photos').upload(chemin, gros, { contentType: 'image/jpeg', upsert: true });
  verifier('plus d’1 Mo est refusé', !!trop.error);
  const libre = await A.storage.from('child-photos').upload(`${lucas}/portrait.jpg`, jpeg1, { contentType: 'image/jpeg' });
  verifier('un autre nom que avatar.jpg est refusé', !!libre.error);
  const horsEnfant = await A.storage.from('child-photos').upload(`${zoe}/avatar.jpg`, jpeg1, { contentType: 'image/jpeg' });
  verifier('A : photo de l’enfant d’un autre foyer refusée', !!horsEnfant.error);

  // 6. photo_path d'un autre enfant : contrainte.
  const { error: autre } = await A.from('children').update({ photo_path: `${zoe}/avatar.jpg` }).eq('id', lucas);
  verifier('photo_path vers la photo d’un autre enfant refusé (contrainte)', !!autre);

  // 7. Suppression : colonne d'abord, objet ensuite (comme l'app).
  const { error: raz } = await B.from('children').update({ photo_path: null }).eq('id', lucas);
  verifier('B met photo_path à NULL', !raz, raz?.message ?? '');
  const rm = await B.storage.from('child-photos').remove([chemin]);
  verifier('B supprime l’objet', !rm.error && sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${chemin}'`) === '0', rm.error?.message ?? '');
  const apres = await A.storage.from('child-photos').createSignedUrl(chemin, 60);
  verifier('plus d’URL signée après suppression', !!apres.error || !apres.data?.signedUrl);

  // 8. Un responsable qui QUITTE le carnet (quitter_carnet) perd lecture, remplacement, suppression et dépôt de la photo.
  const mila = await creerEnfant(A, 'Mila');
  sql(`insert into public.responsables (foyer_id, user_id, child_id, lien)
       select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${mila}'`);
  const pMila = `${mila}/avatar.jpg`;
  const upMila = await A.storage.from('child-photos').upload(pMila, jpeg1, { contentType: 'image/jpeg', upsert: true });
  verifier('A dépose la photo de Mila', !upMila.error, upMila.error?.message ?? '');
  const avant = await B.storage.from('child-photos').createSignedUrl(pMila, 60);
  verifier('B (encore responsable de Mila) lit la photo', !avant.error && !!avant.data?.signedUrl, avant.error?.message ?? '');
  const { error: depart } = await B.rpc('quitter_carnet', { p_child_id: mila });
  verifier('B quitte le carnet de Mila (quitter_carnet)', !depart, depart?.message ?? '');
  const apresB = await B.storage.from('child-photos').createSignedUrl(pMila, 60);
  verifier('B parti : plus d’URL signée', !!apresB.error || !apresB.data?.signedUrl);
  const dlB = await B.storage.from('child-photos').download(pMila);
  verifier('B parti : lecture refusée', !!dlB.error);
  const upB = await B.storage.from('child-photos').upload(pMila, jpeg2, { contentType: 'image/jpeg', upsert: true });
  verifier('B parti : remplacement refusé', !!upB.error);
  await B.storage.from('child-photos').remove([pMila]);
  verifier('B parti : suppression sans effet (la photo existe toujours)', sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${pMila}'`) === '1');
  const resteA = await A.storage.from('child-photos').createSignedUrl(pMila, 60);
  verifier('A (resté responsable) lit toujours la photo de Mila', !resteA.error && !!resteA.data?.signedUrl);

  // 9. Enfant EN COURS D'EFFACEMENT : la photo n'est plus lisible, ni remplaçable, ni supprimable par sa famille.
  // (l'effacement d'un enfant n'est demandé que par son UNIQUE responsable : règle du serveur, erreur « plusieurs_responsables »)
  const noe = await creerEnfant(A, 'Noé');
  const pNoe = `${noe}/avatar.jpg`;
  const upNoe = await A.storage.from('child-photos').upload(pNoe, jpeg1, { contentType: 'image/jpeg', upsert: true });
  verifier('A dépose la photo de Noé', !upNoe.error, upNoe.error?.message ?? '');
  const { error: demande } = await A.rpc('demander_effacement_enfant', { p_child_id: noe });
  verifier('A demande l’effacement de Noé (30 jours)', !demande, demande?.message ?? '');
  for (const [qui, cl] of [['A (seul responsable)', A]] as const) {
    const l = await cl.storage.from('child-photos').createSignedUrl(pNoe, 60);
    verifier(`${qui} : photo de l’enfant en cours d’effacement non lisible (pas d’URL signée)`, !!l.error || !l.data?.signedUrl);
    const r = await cl.storage.from('child-photos').upload(pNoe, jpeg2, { contentType: 'image/jpeg', upsert: true });
    verifier(`${qui} : remplacement refusé`, !!r.error);
    await cl.storage.from('child-photos').remove([pNoe]);
    verifier(`${qui} : suppression sans effet`, sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${pNoe}'`) === '1');
  }
} finally {
  // Nettoyage : objets par l'API Storage (jamais en SQL), enfants, comptes.
  const restes = sql(`select name from storage.objects where bucket_id='child-photos' and owner_id in ('${ids.a}','${ids.b}','${ids.c}')`).split('\n').filter(Boolean);
  if (restes.length) await admin.storage.from('child-photos').remove(restes);
  sql(`delete from public.demandes_effacement where user_id in ('${ids.a}','${ids.b}','${ids.c}','${ids.d}')`);
  sql(`delete from public.children where id in (select child_id from public.responsables where user_id in ('${ids.a}','${ids.b}','${ids.c}'))`);
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
}
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
