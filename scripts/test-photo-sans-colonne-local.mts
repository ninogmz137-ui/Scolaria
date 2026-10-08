// Schéma SANS M35 (base locale avant la migration) : l'app ne casse jamais, repli sans photo, et SEULE l'erreur
// « colonne inconnue » est avalée. Prérequis : base locale SANS M35 (appliquer l'inverse d'abord : migrations_down/
// 20261005100000_m35_photo_enfant_down.sql) ; le script refuse de tourner si la colonne existe.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { estColonneInconnue } from '../src/utils/photoEnfant.ts';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}
if (sql(`select count(*) from information_schema.columns where table_name='children' and column_name='photo_path'`) !== '0') {
  console.log('Refus : la colonne photo_path existe (M35 appliquée en local). Appliquer l’inverse avant ce test.');
  process.exit(2);
}

const email = `sanscolonne-${Date.now()}@exemple.test`;
const mdp = 'Carnet-test-2026!';
const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
if (eu) throw new Error(eu.message);
try {
  const A = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  await A.auth.signInWithPassword({ email, password: mdp });
  const { data: c } = await A.rpc('create_child', { p_first_name: 'Test', p_last_name: 'Colonne', p_birth_date: null, p_age: 6, p_classe: 'CP', p_school: 'École test' });
  const id = ((c as any)?.id ?? (c as any)?.[0]?.id) as string;

  // Lectures de l'app : select('*') — aucune ne nomme photo_path.
  const lecture = await A.from('children').select('*').order('created_at');
  verifier('lecture des enfants (select *) : aucune erreur sans la colonne', !lecture.error && (lecture.data ?? []).length === 1, lecture.error?.message ?? '');
  verifier('la ligne n’a pas de photo_path (repli : pas de photo)', !!lecture.data?.[0] && !('photo_path' in lecture.data[0]));
  const un = await A.from('children').select('*').eq('id', id).single();
  verifier('lecture d’un enfant (export, profil) : aucune erreur', !un.error, un.error?.message ?? '');

  // Écriture : l'erreur « colonne inconnue » est reconnue (et seulement elle).
  const ecriture = await A.from('children').update({ photo_path: `${id}/avatar.jpg` }).eq('id', id).select().single();
  verifier('écrire photo_path sans la colonne : erreur', !!ecriture.error);
  verifier(`… reconnue comme « colonne inconnue » (code ${ecriture.error?.code})`, estColonneInconnue(ecriture.error));
  verifier('lecture d’une colonne inconnue (42703 côté SQL) reconnue', estColonneInconnue({ code: '42703', message: 'column children.photo_path does not exist' }));

  // Les autres erreurs restent visibles.
  const autreColonne = await A.from('children').update({ zzz_inconnue: 1 }).eq('id', id).select().single();
  verifier('une AUTRE colonne inconnue n’est pas avalée', !!autreColonne.error && !estColonneInconnue(autreColonne.error));
  const mauvaisId = await A.from('children').update({ color: '#4338CA' }).eq('id', 'pas-un-uuid').select();
  verifier('identifiant invalide (22P02) : erreur visible', !!mauvaisId.error && !estColonneInconnue(mauvaisId.error), mauvaisId.error?.code);
  const anon = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const sansSession = await anon.from('children').update({ color: '#4338CA' }).eq('id', id).select();
  verifier('sans session : aucune ligne modifiée, pas de repli silencieux', !estColonneInconnue(sansSession.error) && (sansSession.data ?? []).length === 0);
  verifier('erreur réseau : visible', !estColonneInconnue(new TypeError('Network request failed')) && !estColonneInconnue(null) && !estColonneInconnue(undefined));
} finally {
  sql(`delete from public.children where id in (select child_id from public.responsables where user_id = '${u.user!.id}')`);
  await admin.auth.admin.deleteUser(u.user!.id);
}
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
