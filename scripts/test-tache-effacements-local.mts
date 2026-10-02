// Test de la tâche quotidienne d'effacement (M26) et de son journal, sur le Supabase LOCAL (jamais la production) :
// secret présent → 200 + journal « succes » avec compteurs ; secret absent → 401 + « echec / secret_absent » ;
// mauvaise clé → 401 + « echec / non_autorise » ; le journal ne contient aucune donnée personnelle ;
// l'app (rôle authenticated) ne peut ni lire le journal ni lancer la tâche.
// Prérequis : `npx supabase start` ; M25 et M26 appliquées en local ; la fonction servie avec
//   npx supabase functions serve executer-effacements --no-verify-jwt
import { execSync } from 'node:child_process';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
if (!/127\.0\.0\.1|localhost/.test(statut.API_URL)) throw new Error('Refus : ce test ne tourne que sur le Supabase LOCAL.');
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

function poserSecrets(cle: string | null) {
  sql(`delete from vault.secrets where name in ('cle_service_effacements','url_projet');
       select vault.create_secret('http://host.docker.internal:54321', 'url_projet');
       ${cle === null ? '' : `select vault.create_secret('${cle}', 'cle_service_effacements');`}`);
}
async function passage(): Promise<string> {
  sql('delete from public.journal_executions_effacement;');
  sql('select public.lancer_executer_effacements();');
  await attendre(7000);
  sql('select public.journaliser_executions_effacement();');
  return sql('select statut, coalesce(code_http,0), coalesce(dues,-1), coalesce(executees,-1), coalesce(echecs,-1), coalesce(raison,\'\') from public.journal_executions_effacement order by id desc limit 1;');
}

// 1. Secret correct
poserSecrets(statut.SERVICE_ROLE_KEY);
let l = await passage();
verifier('avec le secret : succès, HTTP 200, compteurs lus', /^succes\|200\|\d+\|\d+\|0\|$/.test(l), l);

// 2. Secret absent
poserSecrets(null);
l = await passage();
verifier('sans le secret : échec « secret_absent », HTTP 401', l.startsWith('echec|401|') && l.endsWith('|secret_absent'), l);

// 3. Mauvaise clé
poserSecrets('cle-fausse-pour-le-test');
l = await passage();
verifier('mauvaise clé : échec « non_autorise », HTTP 401', l.startsWith('echec|401|') && l.endsWith('|non_autorise'), l);

// 3b. Clé anon (publique) : refusée, même si elle est un JWT valide
poserSecrets(statut.ANON_KEY);
l = await passage();
verifier('clé anon (publique) : échec « non_autorise », HTTP 401', l.startsWith('echec|401|') && l.endsWith('|non_autorise'), l);

// 3c. Nouvelle clé secrète sb_secret_… : acceptée (validation par l'effet, pas par comparaison de chaînes)
if (statut.SECRET_KEY) {
  poserSecrets(statut.SECRET_KEY);
  l = await passage();
  verifier('clé sb_secret_… : succès, HTTP 200', /^succes\|200\|/.test(l), l);
}

// 4. Aucune donnée personnelle dans le journal : seulement des nombres, un statut et une raison courte
const colonnes = sql(`select string_agg(column_name || ':' || data_type, ',' order by ordinal_position) from information_schema.columns where table_name = 'journal_executions_effacement'`);
verifier('colonnes du journal : dates, nombres, statut, raison seulement', !/uuid|user|child|nom|email/i.test(colonnes), colonnes);

// 5. L'app ne lit ni ne lance rien
const lecture = sql(`begin; set local role authenticated; do $$ begin perform 1 from public.journal_executions_effacement; raise exception 'lisible'; exception when insufficient_privilege then null; end $$; rollback; select 'refuse'`);
verifier('journal illisible par un compte connecté', lecture.endsWith('refuse'), lecture);
const lancement = sql(`begin; set local role authenticated; do $$ begin perform public.lancer_executer_effacements(); raise exception 'lance'; exception when insufficient_privilege then null; end $$; rollback; select 'refuse'`);
verifier('tâche impossible à lancer par un compte connecté', lancement.endsWith('refuse'), lancement);

// 6. Les deux tâches sont planifiées
const jobs = sql(`select string_agg(jobname || '@' || schedule, ',' order by jobname) from cron.job`);
verifier('deux tâches planifiées (3 h 30 et 3 h 40)', jobs === 'executer-effacements@30 3 * * *,journaliser-effacements@40 3 * * *', jobs);

// Nettoyage : plus de secret de test, journal vide
sql(`delete from vault.secrets where name in ('cle_service_effacements','url_projet'); delete from public.journal_executions_effacement;`);
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
