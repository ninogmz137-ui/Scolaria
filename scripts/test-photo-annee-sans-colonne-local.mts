// Transition M36 : une base SANS academic_years.photo_path (c'est l'état de Paris tant que M36 n'y est pas appliquée).
// L'app envoie la requête des années ; l'erreur « colonne inconnue » (42703) doit être reconnue par estColonneInconnue (repli SILENCIEUX sur
// l'ancien modèle children.photo_path), et l'écriture d'une photo d'année ne doit jamais être tentée. Sur le Supabase LOCAL seulement :
// le test applique l'inverse de M36, vérifie, puis REMET TOUJOURS M36 (bloc finally) et rejoue le test SQL de M36.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { estColonneInconnue } from '../src/utils/photoEnfant.ts';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (entree: string) => execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: entree, encoding: 'utf8' }).trim();
const M36 = readFileSync('supabase/migrations/20261007200000_m36_photo_par_annee.sql', 'utf8');
const INVERSE = readFileSync('supabase/migrations_down/20261007200000_m36_photo_par_annee_down.sql', 'utf8');
const rechargerSchema = async () => {
  psql(`notify pgrst, 'reload schema'`);
  await new Promise((r) => setTimeout(r, 3000));
};
let ok = 0;
let echecs = 0;
const verifier = (nom: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  cond ? ok++ : echecs++;
};

try {
  psql(INVERSE);
  await rechargerSchema();
  verifier('sans M36 : la colonne academic_years.photo_path n\'existe pas', psql(`select count(*) from information_schema.columns where table_name='academic_years' and column_name='photo_path'`) === '0');
  const { error } = await admin.from('academic_years').select('id, student_id, annee_scolaire, statut, photo_path, updated_at').limit(1);
  verifier('la requête des années de l\'app échoue sur « colonne inconnue »', !!error, 'aucune erreur');
  verifier('estColonneInconnue reconnaît cette erreur (repli silencieux sur l\'ancien modèle)', estColonneInconnue(error), JSON.stringify(error));
  const { error: ecriture } = await admin.from('academic_years').update({ photo_path: null }).eq('id', '00000000-0000-4000-8000-000000000000');
  verifier('l\'écriture d\'une photo d\'année échoue aussi sur « colonne inconnue » (l\'app ne la tente pas sans la colonne)', estColonneInconnue(ecriture), JSON.stringify(ecriture));
  const { error: ancien } = await admin.from('children').select('id, photo_path').limit(1);
  verifier('l\'ancien modèle (children.photo_path) répond toujours', !ancien, JSON.stringify(ancien));
} finally {
  psql(M36);
  await rechargerSchema();
}
verifier('M36 remise en place (colonne présente)', psql(`select count(*) from information_schema.columns where table_name='academic_years' and column_name='photo_path'`) === '1');
const { error: apres } = await admin.from('academic_years').select('id, photo_path').limit(1);
verifier('avec M36 : la requête des années répond', !apres, JSON.stringify(apres));
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
