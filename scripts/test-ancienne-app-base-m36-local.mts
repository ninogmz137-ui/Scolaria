// « BASE NOUVELLE, ANCIENNE APP » : une base locale AVEC M36, parlée par le code d'AVANT (Paris reçoit M36 avant que les appareils
// ne soient mis à jour). On rejoue, appel pour appel, ce que faisait l'ancienne app : lecture de children (select *), photo posée à
// <enfant>/avatar.jpg + children.photo_path, URL signée, remplacement par le 2e responsable, suppression (colonne d'abord, objet ensuite).
// Puis le cas de flotte mixte (un responsable sur la nouvelle app, l'autre sur l'ancienne) : rien n'échoue, mais l'affichage peut diverger.
// Local seulement (garde d'hôte). Prérequis : M36 appliquée en local.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();
let ok = 0;
let echecs = 0;
const verifier = (nom: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  cond ? ok++ : echecs++;
};
verifier('prérequis : la base locale a M36 (academic_years.photo_path)', sql(`select count(*) from information_schema.columns where table_name='academic_years' and column_name='photo_path'`) === '1');

const t = Date.now();
const mdp = 'Carnet-test-2026!';
const comptes = { a: `claire-${t}@exemple.test`, b: `marc-${t}@exemple.test` };
const ids: Record<string, string> = {};
for (const [k, email] of Object.entries(comptes)) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(error.message);
  ids[k] = data.user!.id;
}
type Client = ReturnType<typeof createClient>;
const session = async (email: string): Promise<Client> => {
  const c = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: mdp });
  if (error) throw new Error(error.message);
  return c;
};
const jpeg = (n: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, n, 0xaa, n, 0xff, 0xd9]);
const memes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const octets = async (c: Client, chemin: string) => {
  const l = await c.storage.from('child-photos').createSignedUrl(chemin, 3600);
  return l.data?.signedUrl ? new Uint8Array(await (await fetch(l.data.signedUrl)).arrayBuffer()) : null;
};
let enfant = '';
try {
  const A = await session(comptes.a);
  const B = await session(comptes.b);
  const { data: ce, error: ec } = await A.rpc('create_child', { p_first_name: 'Ancienne', p_last_name: 'App', p_birth_date: null, p_age: 8, p_classe: 'CE2', p_school: 'École test' });
  if (ec) throw new Error(ec.message);
  enfant = ((ce as any)?.id ?? (ce as any)?.[0]?.id) as string;
  sql(`insert into public.responsables (foyer_id, user_id, child_id, lien) select foyer_id, '${ids.b}', child_id, 'parent' from public.responsables where child_id = '${enfant}'`);
  const annee = sql(`select id from public.academic_years where student_id='${enfant}' and statut='active'`);
  const avatar = `${enfant}/avatar.jpg`;

  // ── L'ANCIENNE APP, appel pour appel ────────────────────────────────────────────────────────
  const { data: liste, error: eListe } = await A.from('children').select('*').order('created_at'); // getChildren()
  verifier('ancienne app : getChildren() (select *) répond, sans erreur', !eListe && (liste ?? []).some((r: any) => r.id === enfant), eListe?.message ?? '');
  verifier('ancienne app : la ligne de l\'enfant porte photo_path (null au départ)', (liste ?? []).find((r: any) => r.id === enfant)?.photo_path === null);
  const { data: ay, error: eAy } = await A.from('academic_years').select('*').eq('student_id', enfant); // lecture « select * » des années
  verifier('ancienne app : lecture des années en select * : une colonne de plus (photo_path = null), aucune erreur', !eAy && (ay ?? []).length === 1 && (ay![0] as any).photo_path === null, eAy?.message ?? '');
  const { error: eNom } = await A.from('academic_years').select('id, annee_scolaire, niveau, etablissement, classe, statut, classe_id, decoupage, echelle_competences').eq('student_id', enfant);
  verifier('ancienne app : lecture des années par colonnes nommées : inchangée', !eNom, eNom?.message ?? '');

  const p1 = jpeg(1);
  const up = await A.storage.from('child-photos').upload(avatar, p1, { contentType: 'image/jpeg', upsert: true }); // envoyerPhoto()
  verifier('ancienne app : dépôt de <enfant>/avatar.jpg (upsert) accepté', !up.error, up.error?.message ?? '');
  const { data: maj, error: eMaj } = await A.from('children').update({ photo_path: avatar }).eq('id', enfant).select().single(); // updateChild()
  verifier('ancienne app : children.photo_path écrit (contrainte <id>/avatar.jpg)', !eMaj && (maj as any)?.photo_path === avatar, eMaj?.message ?? '');
  const { data: relu } = await A.from('children').select('*').eq('id', enfant).single();
  verifier('ancienne app : AFFICHAGE : photo_path relu, URL signée, octets identiques', (relu as any)?.photo_path === avatar && !!(await octets(A, avatar)) && memes((await octets(A, avatar))!, p1));
  const p2 = jpeg(2);
  const upB = await B.storage.from('child-photos').upload(avatar, p2, { contentType: 'image/jpeg', upsert: true });
  verifier('ancienne app : le 2e responsable REMPLACE la photo (upsert)', !upB.error && memes((await octets(A, avatar))!, p2), upB.error?.message ?? '');

  // ── FLOTTE MIXTE : le 2e responsable passe sur la NOUVELLE app et pose la photo de l'année ; le 1er reste sur l'ancienne ───────────────
  const cheminAnnee = `${enfant}/${annee}.jpg`;
  const p3 = jpeg(3);
  const upN = await B.storage.from('child-photos').upload(cheminAnnee, p3, { contentType: 'image/jpeg', upsert: true });
  const { error: eAn } = await B.from('academic_years').update({ photo_path: cheminAnnee }).eq('id', annee);
  verifier('nouvelle app (B) : photo de l\'année posée', !upN.error && !eAn, upN.error?.message ?? eAn?.message ?? '');
  const { data: vuA } = await A.from('children').select('*').eq('id', enfant).single();
  verifier('ancienne app (A) : ne casse pas, affiche encore l\'ANCIENNE photo (octets de B, 2e version)', (vuA as any)?.photo_path === avatar && memes((await octets(A, avatar))!, p2));
  // ce qui DIVERGE (sans échec) : A voit l'ancienne photo, B (nouvelle app) voit celle de l'année.

  // ── Suppression par l'ancienne app : colonne d'abord, objet ensuite ──────────────────────────────────────────────────
  const { error: eRaz } = await A.from('children').update({ photo_path: null }).eq('id', enfant);
  const { error: eRm } = await A.storage.from('child-photos').remove([avatar]);
  verifier('ancienne app : suppression (photo_path NULL puis objet) réussit', !eRaz && !eRm && sql(`select count(*) from storage.objects where bucket_id='child-photos' and name='${avatar}'`) === '0');
  verifier('… sans toucher à la photo de l\'année posée par la nouvelle app (elle reste : divergence, pas d\'échec)', sql(`select count(*) from public.academic_years where id='${annee}' and photo_path is not null`) === '1' && !!(await octets(B, cheminAnnee)));

  // ── CE QUI ÉCHOUERAIT ────────────────────────────────────────────────────────────────────────────────────
  // (1) L'ancienne app n'écrit jamais ailleurs que <enfant>/avatar.jpg ; hors de ce chemin, la base refuse (comme avant M36).
  const hors = await A.storage.from('child-photos').upload(`${enfant}/portrait.jpg`, jpeg(4), { contentType: 'image/jpeg' });
  verifier('un chemin libre est toujours refusé (comme avant M36)', !!hors.error);
  // (2) Après M37 (NON écrite, hors de ce lot) : retrait de children.photo_path et du chemin avatar.jpg ⇒ l'ancienne app ne pourrait plus
  //     ni écrire sa photo (dépôt refusé) ni la relire (colonne absente). C'est pourquoi M37 n'est lancée qu'une fois les appareils à jour.
  console.log('INFO  échouerait APRÈS M37 (non écrite) : dépôt d\'avatar.jpg refusé, children.photo_path absente — d\'où M37 en lot séparé, après mise à jour des appareils.');
} finally {
  if (enfant) {
    const { data } = await admin.storage.from('child-photos').list(enfant, { limit: 100 });
    const noms = (data ?? []).filter((o) => o.name && o.id).map((o) => `${enfant}/${o.name}`);
    if (noms.length) await admin.storage.from('child-photos').remove(noms);
    sql(`delete from public.children where id = '${enfant}'`);
  }
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
}
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) sur ${ok + echecs} ──`);
process.exitCode = echecs === 0 ? 0 : 1;
