// Restauration d'une sauvegarde hebdomadaire (scripts/sauvegarde-semaine.mjs) dans la base LOCALE (Docker).
// JAMAIS vers Paris : la cible est codée en dur (conteneur supabase_db_*, --local). Une restauration vers un projet
// distant se fait à la main, après validation (tasks/sauvegarde.md).
// Étapes : db reset local → vidage (public, auth, storage) → roles.sql, schema.sql, extras-auth-storage.sql, data.sql
// (sans storage.objects) → fichiers du bucket (API Storage locale, un par un) → contrôles : lignes de chaque table,
// structure (politiques, fonctions, déclencheurs, index), déclencheur d'inscription, bucket, SHA-256 de chaque fichier.
// Code de sortie 0 = tout est identique. Après un test : `npx supabase db reset` remet la base locale propre.
// Usage : node scripts/restaurer-sauvegarde.mjs <dossier de sauvegarde>
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierArg = process.argv[2];
const CONTENEUR = 'supabase_db_Scolaria';
if (!dossierArg) {
  console.error('Usage : node scripts/restaurer-sauvegarde.mjs <dossier de sauvegarde>');
  process.exit(2);
}
if (!CONTENEUR.startsWith('supabase_db_')) throw new Error('cible refusée : seule la base locale est autorisée');

const echecs = [];
const dire = (m) => console.log(m);
const controle = (ok, libelle) => {
  dire(`  ${ok ? 'OK    ' : 'ECHEC '} ${libelle}`);
  if (!ok) echecs.push(libelle);
};
const court = (s, n = 600) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'restauration-'));

function trouverCli() {
  const base = path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  let meilleur = null;
  for (const h of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const exe = path.join(base, h, 'node_modules', '@supabase', 'cli-windows-x64', 'bin', 'supabase.exe');
    if (fs.existsSync(exe)) {
      const t = fs.statSync(exe).mtimeMs;
      if (!meilleur || t > meilleur.t) meilleur = { exe, t };
    }
  }
  return meilleur?.exe ?? null;
}
const cliExe = trouverCli();

function cli(args, cwd = depot) {
  const r = spawnSync(cliExe, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`supabase ${args.slice(0, 2).join(' ')} : ${r.error.message}`);
  if (r.status !== 0) throw new Error(`supabase ${args.slice(0, 2).join(' ')} en échec : ${court(r.stderr || r.stdout)}`);
  return r.stdout ?? '';
}

const docker = (args, opts = {}) => spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, ...opts });

// psql dans le conteneur local (superutilisateur local) ; fichier copié dans le conteneur.
function psqlFichier(fichier, arretSurErreur = true) {
  const nom = path.basename(fichier);
  const cp = docker(['cp', fichier, `${CONTENEUR}:/tmp/${nom}`]);
  if (cp.status !== 0) throw new Error(`docker cp ${nom} : ${court(cp.stderr)}`);
  const opts = ['exec', CONTENEUR, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-q', '-f', `/tmp/${nom}`];
  if (arretSurErreur) opts.push('-v', 'ON_ERROR_STOP=1');
  const r = docker(opts);
  docker(['exec', CONTENEUR, 'rm', '-f', `/tmp/${nom}`]);
  if (arretSurErreur && r.status !== 0) throw new Error(`psql ${nom} en échec : ${court(r.stderr || r.stdout)}`);
  return r.stdout;
}
function psqlValeur(sql) {
  const r = docker(['exec', CONTENEUR, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-tA', '-c', sql]);
  if (r.status !== 0) throw new Error(`psql : ${court(r.stderr)}`);
  return r.stdout.trim();
}

function listerFichiers(dossier) {
  const out = [];
  const marche = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else out.push(p);
    }
  };
  if (fs.existsSync(dossier)) marche(dossier);
  return out;
}
const sha256 = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const MIMES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', pdf: 'application/pdf' };

try {
  if (!cliExe) throw new Error('CLI Supabase introuvable dans le cache npx');
  const dossier = path.resolve(dossierArg);
  const man = JSON.parse(fs.readFileSync(path.join(dossier, 'manifeste.json'), 'utf8'));
  if (man.statut !== 'complete') throw new Error('sauvegarde non complète');
  for (const f of ['roles.sql', 'schema.sql', 'data.sql', 'extras-auth-storage.sql', 'comptes.json', 'fichiers.json']) {
    if (!fs.existsSync(path.join(dossier, f))) throw new Error(`fichier manquant dans la sauvegarde : ${f}`);
  }
  const etat = docker(['inspect', '-f', '{{.State.Running}}', CONTENEUR]).stdout.trim();
  if (etat !== 'true') throw new Error(`base locale arrêtée (${CONTENEUR}) : lancer npx supabase start`);

  dire(`Restauration de ${dossier} (cible : ${CONTENEUR}, LOCAL)`);
  const comptes = JSON.parse(fs.readFileSync(path.join(dossier, 'comptes.json'), 'utf8'));
  const fichiers = JSON.parse(fs.readFileSync(path.join(dossier, 'fichiers.json'), 'utf8'));

  // 1. Base locale propre (migrations).
  dire('1. Réinitialisation de la base locale (db reset)...');
  cli(['db', 'reset', '--local']);

  // 2. Vider : fichiers du bucket (API), puis public / auth / storage (métadonnées).
  dire('2. Vidage (fichiers du bucket local, schémas public, auth, storage)...');
  try {
    cli(['storage', 'rm', '-r', 'ss:///carnet', '--local', '--experimental']);
  } catch {
    /* bucket vide */
  }
  const tablesAuth = Object.keys(comptes).filter((t) => t.startsWith('auth.') && t !== 'auth.schema_migrations');
  fs.writeFileSync(
    path.join(tmp, 'vide.sql'),
    ['DROP SCHEMA public CASCADE;', 'CREATE SCHEMA public;', `TRUNCATE ${tablesAuth.join(', ')} CASCADE;`, 'TRUNCATE storage.objects, storage.buckets CASCADE;'].join('\n') + '\n',
  );
  psqlFichier(path.join(tmp, 'vide.sql'));

  // 3. Rejouer la sauvegarde : rôles, schéma, déclencheurs/politiques auth+storage, données.
  dire('3. Rôles, schéma, déclencheurs et politiques auth/storage, données...');
  psqlFichier(path.join(dossier, 'roles.sql'), false);
  psqlFichier(path.join(dossier, 'schema.sql'));
  psqlFichier(path.join(dossier, 'extras-auth-storage.sql'));
  // Les lignes de storage.objects ne sont pas rejouées : elles sont recréées par l'envoi des fichiers (étape 4).
  const lignes = fs.readFileSync(path.join(dossier, 'data.sql'), 'utf8').split(/\r?\n/);
  const gardees = [];
  let saut = false;
  for (const l of lignes) {
    if (saut) {
      if (l === '\\.') saut = false;
      continue;
    }
    if (/^COPY "storage"\."(objects|s3_multipart_uploads|s3_multipart_uploads_parts)" /.test(l)) {
      saut = true;
      continue;
    }
    gardees.push(l);
  }
  fs.writeFileSync(path.join(tmp, 'donnees.sql'), gardees.join('\n'));
  psqlFichier(path.join(tmp, 'donnees.sql'));

  // 4. Fichiers du bucket, un par un (type MIME fixé d'après l'extension : la détection automatique de la CLI peut
  // renvoyer text/html, refusé par le bucket qui n'accepte que jpeg, png, heic, pdf).
  dire('4. Fichiers du bucket carnet...');
  const src = path.join(dossier, 'fichiers');
  for (const f of fichiers) {
    const ext = path.extname(f.chemin).slice(1).toLowerCase();
    cli(['storage', 'cp', f.chemin, 'ss:///' + f.chemin, '--local', '--experimental', '--content-type', MIMES[ext] ?? 'application/octet-stream', '--workdir', depot], src);
  }

  // 5. Contrôles.
  dire('5. Contrôles');
  for (const [table, attendu] of Object.entries(comptes)) {
    if (table === 'auth.schema_migrations') continue;
    const n = psqlValeur(`select count(*) from ${table}`);
    controle(n === String(attendu), `lignes ${table} : attendu ${attendu}, obtenu ${n}`);
  }
  controle(psqlValeur("select count(*) from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal") === '1', 'déclencheur on_auth_user_created sur auth.users');
  const st = man.structure;
  const verifs = [
    ['politiques public', st.politiques, "select count(*) from pg_policies where schemaname = 'public'"],
    ['fonctions public', st.fonctions, "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'"],
    ['déclencheurs public', st.declencheurs, "select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'public'"],
    ['index public', st.index_public, "select count(*) from pg_indexes where schemaname = 'public'"],
  ];
  for (const [lib, attendu, sql] of verifs) {
    const n = psqlValeur(sql);
    controle(n === String(attendu), `${lib} : attendu ${attendu}, obtenu ${n}`);
  }
  controle(Number(psqlValeur("select count(*) from pg_policies where schemaname = 'storage' and policyname like 'carnet%'")) >= 3, 'politiques du bucket carnet (>= 3)');
  controle(psqlValeur("select count(*) from storage.buckets where id = 'carnet'") === '1', 'bucket carnet présent');
  const objets = psqlValeur("select count(*) from storage.objects where bucket_id = 'carnet'");
  controle(objets === String(fichiers.length), `objets du bucket : attendu ${fichiers.length}, obtenu ${objets}`);
  if (fichiers.length > 0) {
    const retour = path.join(tmp, 'retour');
    fs.mkdirSync(retour);
    cli(['storage', 'cp', '-r', 'ss:///carnet', 'carnet', '--local', '--experimental', '--workdir', depot], retour);
    let mauvais = 0;
    for (const f of fichiers) {
      const p = path.join(retour, ...f.chemin.split('/'));
      if (!fs.existsSync(p) || sha256(p) !== f.sha256) mauvais++;
    }
    controle(mauvais === 0, `fichiers identiques (SHA-256) : ${fichiers.length - mauvais} / ${fichiers.length}`);
  }
} catch (e) {
  dire('ERREUR : ' + (e?.message ?? e));
  echecs.push(String(e?.message ?? e));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (echecs.length === 0) {
  dire('RESTAURATION VÉRIFIÉE : tout est identique.');
  process.exit(0);
}
dire(`RESTAURATION EN ÉCHEC : ${echecs.length} contrôle(s).`);
process.exit(1);
