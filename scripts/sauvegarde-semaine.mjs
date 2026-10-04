// Sauvegarde hebdomadaire Scolaria : base (rôles, schéma, données) + fichiers du bucket « carnet ».
// Destination HORS dépôt : C:\Users\admin\ScolariaBackups\hebdo\AAAA-MM-JJ_HHmm\ (conservées 56 jours = 8 semaines ; dossiers « avant_Mxx » du dossier parent : 30 jours).
// Aucun secret ici : la CLI Supabase s'authentifie avec la session de l'utilisateur Windows (supabase login),
// la base est jointe par un rôle temporaire. Rien n'est lu dans .env. Détails : tasks/sauvegarde.md.
// Usage : node scripts/sauvegarde-semaine.mjs [--cible linked|local] [--racine <dossier>] [--jours-hebdo 56] [--jours-avant 30] [--purge-avant <dossier>]
// (en Node et non en PowerShell : l'antivirus (Avast) supprimait les scripts .ps1 écrits dans le dépôt)
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refuserDansDepot } from './garde-destination.mjs';
import { appliquerRotation, JOURS_AVANT, JOURS_HEBDO, planifierRotation } from './rotation-sauvegardes.mjs';

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nom, defaut) => {
  const i = process.argv.indexOf('--' + nom);
  return i >= 0 ? process.argv[i + 1] : defaut;
};
const cible = arg('cible', 'linked');
const racine = arg('racine', 'C:\\Users\\admin\\ScolariaBackups\\hebdo');
const joursHebdo = Number(arg('jours-hebdo', String(JOURS_HEBDO)));
const joursAvant = Number(arg('jours-avant', String(JOURS_AVANT)));
// Le dossier des « avant_Mxx » (parent de la destination) n'est purgé qu'avec la destination par défaut (ou en le désignant) :
// une destination d'essai ne doit jamais faire supprimer les voisins.
const DEFAUT = 'C:\\Users\\admin\\ScolariaBackups\\hebdo';
const dossierAvant = arg('purge-avant', path.resolve(racine).toLowerCase() === DEFAUT.toLowerCase() ? path.dirname(racine) : '');
if (!['linked', 'local'].includes(cible)) throw new Error('--cible : linked ou local');
refuserDansDepot(racine, depot, 'la destination (--racine)');
const flag = '--' + cible;

const debut = new Date();
const pad = (n) => String(n).padStart(2, '0');
const horodatage = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nom = `${horodatage(debut)}_${pad(debut.getHours())}${pad(debut.getMinutes())}`;
const travail = path.join(racine, '.en-cours-' + nom);
const journal = path.join(racine, 'journal.log');

function ecrireJournal(statut, detail) {
  const d = new Date();
  const ligne = `${horodatage(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} | ${statut} | ${cible} | ${nom} | ${detail}\r\n`;
  fs.appendFileSync(journal, ligne, 'utf8');
}

// Binaire intact de la CLI dans le cache npx (un npm install frais voyait son .exe disparaître : ne pas réinstaller).
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

const court = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Lance la CLI ; échec si code de sortie non nul ; la sortie standard peut aller dans un fichier.
function cli(cliExe, args, { sortie, cwd = depot } = {}) {
  const r = spawnSync(cliExe, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 });
  if (sortie) fs.writeFileSync(sortie, r.stdout ?? '');
  if (r.error) throw new Error(`supabase ${args.slice(0, 2).join(' ')} : ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`supabase ${args.slice(0, 2).join(' ')} en échec (code ${r.status}) : ${court(r.stderr || r.stdout)}`);
  }
  return r.stdout ?? '';
}

// --agent yes force la sortie JSON : sans elle (tâche planifiée, hors session d'agent) la CLI imprime un tableau texte.
// La CLI imprime parfois du texte avant l'objet JSON : on cherche le premier « {" », et on montre le début de la sortie en cas d'échec.
function extraireJson(brut, contexte) {
  const m = /\{\s*"/.exec(brut);
  try {
    if (!m) throw new Error('aucun objet JSON');
    return JSON.parse(brut.slice(m.index));
  } catch (e) {
    throw new Error(`${contexte} : sortie illisible (${e.message}) : ${court(brut, 200)}`);
  }
}

function lireLignes(cliExe, sql, nomFichier) {
  const f = path.join(travail, nomFichier + '.sql');
  fs.writeFileSync(f, sql);
  const brut = cli(cliExe, ['db', 'query', flag, '-f', f, '--agent', 'yes']);
  fs.rmSync(f);
  return extraireJson(brut, `db query ${nomFichier}`).rows;
}

// Le dump de schéma / données passe par pg_dump dans Docker : démarrer Docker Desktop si besoin.
async function assurerDocker() {
  const ok = () => spawnSync('docker', ['info'], { windowsHide: true }).status === 0;
  if (ok()) return;
  const exe = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
  if (fs.existsSync(exe)) spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    if (ok()) return;
  }
  throw new Error('Docker Desktop indisponible (non démarré en 3 minutes)');
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

const SQL_EXTRAS = `select 'DROP TRIGGER IF EXISTS ' || quote_ident(t.tgname) || ' ON ' || c.oid::regclass || '; ' || pg_get_triggerdef(t.oid) || ';' as s
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and n.nspname in ('auth','storage') and pn.nspname = 'public'
union all
select format('DROP POLICY IF EXISTS %I ON %I.%I; CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename,
  policyname, schemaname, tablename, permissive, cmd, array_to_string(roles, ', '),
  case when qual is not null then ' USING (' || qual || ')' else '' end,
  case when with_check is not null then ' WITH CHECK (' || with_check || ')' else '' end)
from pg_policies where schemaname = 'storage'`;

const SQL_COMPTES = `select table_schema || '.' || table_name as t,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int as n
from information_schema.tables where table_schema in ('public','auth') and table_type = 'BASE TABLE' order by 1`;

const SQL_STRUCTURE = `select
  (select count(*) from pg_policies where schemaname = 'public')::int as politiques,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public')::int as fonctions,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'public')::int as declencheurs,
  (select count(*) from pg_indexes where schemaname = 'public')::int as index_public`;

async function main() {
  fs.mkdirSync(racine, { recursive: true });
  const cliExe = trouverCli();
  if (!cliExe) throw new Error('CLI Supabase introuvable dans le cache npx');
  await assurerDocker();
  fs.mkdirSync(travail);

  // 1. Base : rôles, schéma, données (COPY). Le dump inclut auth.* (comptes), public.* et les métadonnées de storage.
  cli(cliExe, ['db', 'dump', flag, '--role-only', '-f', path.join(travail, 'roles.sql')]);
  cli(cliExe, ['db', 'dump', flag, '-f', path.join(travail, 'schema.sql')]);
  cli(cliExe, ['db', 'dump', flag, '--data-only', '--use-copy', '-f', path.join(travail, 'data.sql')]);
  for (const f of ['roles.sql', 'schema.sql', 'data.sql']) {
    const t = fs.statSync(path.join(travail, f)).size;
    if (t < 200) throw new Error(`fichier ${f} vide ou tronqué (${t} octets)`);
  }

  // 1 bis. Ce que db dump n'exporte pas : déclencheurs de NOS fonctions posés sur auth.* / storage.* (profil créé à
  // l'inscription) et politiques de storage.objects (bucket « carnet »). Rejouable (DROP ... IF EXISTS avant).
  const extras = lireLignes(cliExe, SQL_EXTRAS, 'extras').map((r) => r.s);
  if (extras.length < 1) throw new Error('déclencheurs auth/storage introuvables (extras vide)');
  fs.writeFileSync(path.join(travail, 'extras-auth-storage.sql'), extras.join('\n') + '\n');

  // 2. Comptes de lignes et structure (contrôles de la restauration).
  const comptes = {};
  for (const r of lireLignes(cliExe, SQL_COMPTES, 'comptes')) comptes[r.t] = Number(r.n);
  if (Object.keys(comptes).length < 10) throw new Error('comptes de lignes incomplets');
  fs.writeFileSync(path.join(travail, 'comptes.json'), JSON.stringify(comptes, null, 2));
  const structure = lireLignes(cliExe, SQL_STRUCTURE, 'structure')[0];

  // 3. Fichiers du bucket « carnet » (API Storage) : liste, copie, contrôle du nombre, empreintes.
  const fich = path.join(travail, 'fichiers');
  fs.mkdirSync(fich);
  const liste = path.join(travail, 'liste.txt');
  cli(cliExe, ['storage', 'ls', 'ss:///carnet', '-r', flag, '--experimental', '--agent', 'yes'], { sortie: liste });
  const brutL = fs.readFileSync(liste, 'utf8');
  const attendus = (extraireJson(brutL, 'storage ls').paths ?? []).filter((p) => p && !p.endsWith('/'));
  if (attendus.length > 0) {
    // Destination RELATIVE : la CLI prend « C: » d'un chemin absolu pour un schéma d'URL ; --workdir garde le projet lié.
    cli(cliExe, ['storage', 'cp', '-r', 'ss:///carnet', 'carnet', flag, '--experimental', '-j', '4', '--workdir', depot], {
      cwd: fich,
      sortie: path.join(travail, 'copie.tmp'),
    });
  }
  const copies = listerFichiers(fich);
  if (copies.length !== attendus.length) throw new Error(`fichiers du bucket : ${attendus.length} listés, ${copies.length} copiés`);
  let octets = 0;
  const empreintes = copies.map((c) => {
    const buf = fs.readFileSync(c);
    octets += buf.length;
    return {
      chemin: path.relative(fich, c).split(path.sep).join('/'),
      octets: buf.length,
      sha256: createHash('sha256').update(buf).digest('hex').toUpperCase(),
    };
  });
  fs.writeFileSync(path.join(travail, 'fichiers.json'), JSON.stringify(empreintes, null, 2));

  // 4. Manifeste, puis le dossier devient la sauvegarde (renommage = sauvegarde complète).
  for (const t of ['liste.txt', 'copie.tmp']) fs.rmSync(path.join(travail, t), { force: true });
  const manifeste = {
    statut: 'complete',
    cible,
    debut: debut.toISOString(),
    fin: new Date().toISOString(),
    cli: cliExe,
    tables: Object.keys(comptes).length,
    lignes: Object.values(comptes).reduce((a, b) => a + b, 0),
    fichiers: copies.length,
    octets_fichiers: octets,
    structure,
  };
  fs.writeFileSync(path.join(travail, 'manifeste.json'), JSON.stringify(manifeste, null, 2));
  fs.renameSync(travail, path.join(racine, nom));

  // 5. Rotation PAR ÂGE (scripts/rotation-sauvegardes.mjs) : hebdomadaires > 56 jours ; « avant_Mxx » > 30 jours (seulement avec la
  //    destination par défaut ou --purge-avant). Chaque suppression est journalisée (PURGE). La plus récente n'est jamais supprimée.
  const plan = planifierRotation({ racine, parent: dossierAvant, joursHebdo, joursAvant });
  const supprimes = appliquerRotation(plan, { racine, parent: dossierAvant, journaliser: ecrireJournal });
  const duree = Math.round((Date.now() - debut.getTime()) / 1000);
  ecrireJournal('OK', `${manifeste.tables} tables, ${manifeste.lignes} lignes, ${copies.length} fichiers, ${duree} s, ${supprimes.length} ancienne(s) supprimée(s)`);
}

try {
  await main();
} catch (e) {
  fs.rmSync(travail, { recursive: true, force: true });
  try {
    fs.mkdirSync(racine, { recursive: true });
    ecrireJournal('ECHEC', court(e?.message ?? e, 400));
  } catch {
    console.error(String(e?.message ?? e));
  }
  process.exit(1);
}
