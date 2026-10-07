// SAUVEGARDE puis RESTAURATION d'un enfant à 3 années photographiées (M36), sur le Supabase LOCAL uniquement :
//   1. un enfant, 3 années, une photo par année (API Storage), références academic_years.photo_path ;
//   2. scripts/sauvegarde-semaine.mjs --cible local (destination HORS dépôt) puis scripts/verifier-sauvegarde.mjs ;
//   3. le bucket de la sauvegarde contient les 3 photos (et le nombre de fichiers du bucket sauvegardé = celui du bucket) ;
//   4. scripts/restaurer-sauvegarde.mjs (db reset local, puis restauration) ;
//   5. les 3 photos sont RETROUVÉES aux mêmes chemins, mêmes SHA-256 (téléchargées par l'API), et academic_years.photo_path pointe vers elles.
// ⚠ La restauration réinitialise la base locale : lancer ensuite `npx supabase@latest db reset --local` (règle du dépôt).
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

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
const sha = (b: Uint8Array | Buffer) => createHash('sha256').update(b).digest('hex');

const t = Date.now();
const email = `sauve-${t}@exemple.test`;
const mdp = 'Carnet-test-2026!';
const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
if (eu) throw new Error(eu.message);
const A = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
await A.auth.signInWithPassword({ email, password: mdp });
const { data: ce, error: ec } = await A.rpc('create_child', { p_first_name: 'Sauvegarde', p_last_name: 'Test', p_birth_date: null, p_age: 10, p_classe: 'CM2', p_school: 'École test' });
if (ec) throw new Error(ec.message);
const enfant = ((ce as any)?.id ?? (ce as any)?.[0]?.id) as string;
const y0 = sql(`select id from public.academic_years where student_id='${enfant}' and statut='active'`);
const debut = Number(sql(`select annee_scolaire from public.academic_years where id='${y0}'`).slice(0, 4));
const annees = [y0];
for (let i = 1; i <= 2; i++) {
  annees.push(sql(`insert into public.academic_years (student_id, annee_scolaire, niveau, etablissement, statut)
    values ('${enfant}', '${debut - i}-${debut - i + 1}', 'CM1', 'École test', 'archivée') returning id`).split('\n')[0]);
}
// Trois « photos » JPEG distinctes (octets variés, taille différente) : leurs SHA-256 sont la preuve.
const photos = annees.map((_, i) => new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, i + 1, ...Array.from({ length: 40 + i * 13 }, (_, k) => (k * 7 + i * 31) & 0xff), 0xff, 0xd9]));
const attendus = new Map<string, string>();
for (let i = 0; i < 3; i++) {
  const chemin = `${enfant}/${annees[i]}.jpg`;
  const up = await A.storage.from('child-photos').upload(chemin, photos[i], { contentType: 'image/jpeg', upsert: true });
  const { error } = await A.from('academic_years').update({ photo_path: chemin }).eq('id', annees[i]);
  if (up.error || error) throw new Error(up.error?.message ?? error?.message);
  attendus.set(chemin, sha(photos[i]));
}
verifier('3 photos déposées (une par année) et 3 références academic_years.photo_path', sql(`select count(*) from public.academic_years where student_id='${enfant}' and photo_path is not null`) === '3');
const nbBucket = Number(sql(`select count(*) from storage.objects where bucket_id='child-photos'`));

// 2. Sauvegarde (destination hors dépôt) puis vérification.
const racine = `C:\\Users\\admin\\ScolariaBackups\\essais-photo-annee-${new Date().toISOString().slice(0, 10)}`;
mkdirSync(racine, { recursive: true });
const sauve = spawnSync('node', ['scripts/sauvegarde-semaine.mjs', '--cible', 'local', '--racine', racine], { encoding: 'utf8', maxBuffer: 1 << 28 });
verifier('sauvegarde locale terminée (code 0)', sauve.status === 0, (sauve.stdout + sauve.stderr).slice(-400));
// --racine est le dossier qui reçoit directement les sauvegardes datées (AAAA-MM-JJ_HHmm) et son journal.log.
const dossiers = existsSync(racine) ? readdirSync(racine).filter((d) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(d)).sort() : [];
const dossier = dossiers.length ? join(racine, dossiers[dossiers.length - 1]) : '';
verifier('dossier de sauvegarde trouvé (hors dépôt)', !!dossier && !dossier.startsWith('C:\\Users\\admin\\Scolaria\\'), dossier);
const verif = spawnSync('node', ['scripts/verifier-sauvegarde.mjs', dossier], { encoding: 'utf8', maxBuffer: 1 << 26 });
verifier('verifier-sauvegarde : tout est conforme (manifeste, SHA-256 des fichiers)', verif.status === 0, (verif.stdout + verif.stderr).slice(-400));
// 3. Le bucket sauvegardé contient les 3 photos, autant de fichiers que le bucket.
function fichiers(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(join(d, e.name)).map((f) => join(e.name, f)) : [e.name]));
}
const dansSauvegarde = fichiers(dossier).map((f) => f.replace(/\\/g, '/'));
const photosSauvees = dansSauvegarde.filter((f) => /child-photos/.test(f) && /\.jpg$/.test(f));
const nos = [...attendus.keys()].filter((c) => photosSauvees.some((f) => f.endsWith(c)));
verifier('la sauvegarde contient les 3 photos de l\'enfant', nos.length === 3, JSON.stringify(photosSauvees.slice(0, 6)));
verifier('autant de fichiers « child-photos » sauvegardés que dans le bucket', photosSauvees.length === nbBucket, `${photosSauvees.length} contre ${nbBucket}`);

// 4. Restauration dans la base LOCALE (db reset puis restauration).
const resto = spawnSync('node', ['scripts/restaurer-sauvegarde.mjs', dossier], { encoding: 'utf8', maxBuffer: 1 << 28 });
verifier('restaurer-sauvegarde : tout est identique (code 0)', resto.status === 0, (resto.stdout + resto.stderr).slice(-600));

// 5. Les 3 photos sont retrouvées, mêmes chemins, mêmes SHA-256 ; les références pointent vers elles.
for (const [chemin, h] of attendus) {
  // Le stockage local vient d'être rechargé : jusqu'à 3 essais (un « fetch failed » transitoire a été vu une fois juste après la restauration).
  let data: Blob | null = null;
  let error: { message: string } | null = null;
  for (let essai = 0; essai < 3 && !data; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, 2500));
    try {
      const r = await admin.storage.from('child-photos').download(chemin);
      data = r.data;
      error = r.error as { message: string } | null;
    } catch (e) {
      error = { message: String(e) };
    }
  }
  const octets = data ? new Uint8Array(await data.arrayBuffer()) : new Uint8Array();
  verifier(`photo retrouvée à ${chemin.slice(0, 8)}…/${chemin.slice(37, 45)}… : même SHA-256`, !error && sha(octets) === h, error?.message ?? '');
}
verifier('academic_years.photo_path pointe vers les 3 photos restaurées', sql(`select count(*) from public.academic_years ay where student_id='${enfant}' and photo_path = student_id::text || '/' || id::text || '.jpg' and exists (select 1 from storage.objects o where o.bucket_id='child-photos' and o.name = ay.photo_path)`) === '3');
const { data: liste } = await admin.storage.from('child-photos').list(enfant, { limit: 100 });
verifier('l\'API de stockage compte 3 objets pour l\'enfant restauré', (liste ?? []).filter((o) => o.id).length === 3);
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) sur ${ok + echecs} ──`);
console.log('⚠ Maintenant : npx supabase@latest db reset --local');
process.exitCode = echecs === 0 ? 0 : 1;
