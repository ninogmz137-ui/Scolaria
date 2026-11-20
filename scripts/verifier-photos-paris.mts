// VÉRIFICATION EN LECTURE SEULE de Paris : photos des enfants, rejouable après chaque geste.
// Pour chaque enfant : les objets de child-photos (chemin, taille, created_at, updated_at, version, eTag), children.photo_path,
// academic_years.photo_path (une ligne par année), et CE QUE LA NOUVELLE APP AFFICHE (même calcul que l'app : src/utils/photoAnnee.ts).
// Aucune image n'est téléchargée ni lue. Chaque mesure est gardée HORS DÉPÔT (C:\Users\admin\ScolariaBackups\verifs-photos\) et comparée à
// la précédente : « ce qui a changé depuis la dernière fois » = l'effet du geste qui vient d'être fait.
// SÉCURITÉ : seules des requêtes SELECT fixes sont envoyées (vérifié avant chaque envoi) ; aucune écriture, aucune migration.
// Usage : npm run verifier-photos-paris [-- --etiquette "après étape 1"]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { choisirPhoto, type LigneAnnee } from '../src/utils/photoAnnee.ts';

const DOSSIER = 'C:\\Users\\admin\\ScolariaBackups\\verifs-photos';
const depot = join(import.meta.dirname, '..');
const iEtiquette = process.argv.indexOf('--etiquette');
const etiquette = iEtiquette > 0 ? process.argv[iEtiquette + 1] ?? '' : '';

// Binaire intact de la CLI dans le cache npx (même méthode que scripts/sauvegarde-semaine.mjs).
function trouverCli(): string | null {
  const base = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  let meilleur: { exe: string; t: number } | null = null;
  for (const h of existsSync(base) ? readdirSync(base) : []) {
    const exe = join(base, h, 'node_modules', '@supabase', 'cli-windows-x64', 'bin', 'supabase.exe');
    if (existsSync(exe)) {
      const t = statSync(exe).mtimeMs;
      if (!meilleur || t > meilleur.t) meilleur = { exe, t };
    }
  }
  return meilleur?.exe ?? null;
}
const cliExe = trouverCli();
if (!cliExe) {
  console.log('CLI Supabase introuvable dans le cache npx (lancer une fois `npx supabase --version`).');
  process.exit(2);
}

type Ligne = Record<string, any>;
/** Une requête SELECT (jamais autre chose) sur la base LIÉE (Paris). */
function lire(sql: string): Ligne[] {
  if (!/^\s*select\b/i.test(sql) || /;\s*\S/.test(sql) || /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b/i.test(sql.replace(/'[^']*'/g, ''))) {
    throw new Error(`requête refusée (lecture seule) : ${sql.slice(0, 60)}`);
  }
  const r = spawnSync(cliExe!, ['db', 'query', '--linked', sql], { cwd: depot, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 });
  const t = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const d = t.indexOf('{');
  if (d < 0) throw new Error(`sortie illisible : ${t.slice(0, 200)}`);
  const j = JSON.parse(t.slice(d, t.lastIndexOf('}') + 1));
  if (j.error) throw new Error(`erreur Paris : ${JSON.stringify(j.error).slice(0, 200)}`);
  return j.rows ?? [];
}

const enfants = lire(`select id, first_name, photo_path, updated_at from public.children order by created_at`);
const annees = lire(`select id, student_id, annee_scolaire, statut, photo_path, updated_at from public.academic_years order by student_id, annee_scolaire`);
const objets = lire(`select name, created_at, updated_at, version, (metadata->>'size') as taille, (metadata->>'eTag') as etag from storage.objects where bucket_id = 'child-photos' order by name`);
const orphelins = lire(`select n as nom from public.photos_orphelines(interval '0 seconds') n`).map((r) => String(r.nom));

const dossierDe = (nom: string) => nom.split('/')[0];
const resume = enfants.map((e) => {
  const lignes = annees.filter((a) => a.student_id === e.id) as unknown as (LigneAnnee & { student_id: string })[];
  const choix = choisirPhoto(lignes, { chemin: e.photo_path ?? null, updatedAt: e.updated_at ?? null });
  const sesObjets = objets.filter((o) => dossierDe(String(o.name)) === e.id);
  const source = choix.chemin === null ? 'initiale (aucune photo)'
    : choix.anterieure ? `photo de l'année N−1 (${choix.anterieure}) avec pastille`
    : choix.ancienne ? 'ancien modèle (children.photo_path), sans pastille'
    : "photo de l'année en cours, sans pastille";
  const manque = choix.chemin !== null && !sesObjets.some((o) => o.name === choix.chemin);
  return { enfant: e, annees: lignes, objets: sesObjets, affichage: { chemin: choix.chemin, source, objetManquant: manque } };
});

const court = (s: unknown) => (s == null ? 'NULL' : String(s).replace(/^([0-9a-f]{8})[0-9a-f-]{28}/, '$1…'));
const hms = (s: unknown) => (s == null ? 'NULL' : String(s).replace('T', ' ').replace(/\+00(:00)?$/, '').slice(0, 23));
const maintenant = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const horodatage = `${maintenant.getFullYear()}-${pad(maintenant.getMonth() + 1)}-${pad(maintenant.getDate())}_${pad(maintenant.getHours())}${pad(maintenant.getMinutes())}${pad(maintenant.getSeconds())}`;
console.log(`══ Photos sur Paris — ${horodatage}${etiquette ? ` — ${etiquette}` : ''} (lecture seule, aucune image) ══`);
for (const r of resume) {
  console.log(`\n── ${r.enfant.first_name} (${court(r.enfant.id)}) ──`);
  console.log(`  children.photo_path : ${court(r.enfant.photo_path)}   (children.updated_at ${hms(r.enfant.updated_at)})`);
  for (const a of r.annees) console.log(`  academic_years ${a.annee_scolaire} [${a.statut}] ${court(a.id)} : photo_path = ${court(a.photo_path)}   (updated_at ${hms(a.updated_at)})`);
  if (!r.objets.length) console.log('  objets child-photos : AUCUN');
  for (const o of r.objets) console.log(`  objet ${court(o.name)} : ${o.taille} octets · created ${hms(o.created_at)} · updated ${hms(o.updated_at)} · version ${court(o.version)} · eTag ${court(o.etag)}`);
  console.log(`  → la nouvelle app affiche : ${r.affichage.source}${r.affichage.objetManquant ? '   ⚠ OBJET MANQUANT pour ce chemin' : ''}`);
}
const horsEnfant = objets.filter((o) => !enfants.some((e) => e.id === dossierDe(String(o.name))));
console.log(`\nObjets child-photos : ${objets.length} au total${horsEnfant.length ? ` ; ⚠ ${horsEnfant.length} hors de tout enfant : ${horsEnfant.map((o) => court(o.name)).join(', ')}` : ''}`);
console.log(`Orphelins (non référencés par children ni academic_years, délai 0) : ${orphelins.length ? orphelins.map(court).join(', ') : 'aucun'}  (le nettoyage quotidien n'agit qu'au-delà de 1 jour)`);

// ── Comparaison avec la mesure précédente, puis sauvegarde de celle-ci (hors dépôt) ────────────────────────────
mkdirSync(DOSSIER, { recursive: true });
const anciennes = readdirSync(DOSSIER).filter((f) => /^\d{4}-\d{2}-\d{2}_\d{6}\.json$/.test(f)).sort();
const instantane = { horodatage, etiquette, enfants: resume.map((r) => ({
  id: r.enfant.id, prenom: r.enfant.first_name, photo_path: r.enfant.photo_path, updated_at: r.enfant.updated_at,
  annees: r.annees.map((a) => ({ id: a.id, annee: a.annee_scolaire, statut: a.statut, photo_path: a.photo_path, updated_at: a.updated_at })),
  objets: r.objets.map((o) => ({ name: o.name, taille: o.taille, created_at: o.created_at, updated_at: o.updated_at, version: o.version, etag: o.etag })),
  affichage: r.affichage.source,
})), orphelins };
if (anciennes.length) {
  const av = JSON.parse(readFileSync(join(DOSSIER, anciennes[anciennes.length - 1]), 'utf8'));
  const diffs: string[] = [];
  const champs = (a: Ligne, b: Ligne, ks: string[], etiq: string) => {
    for (const k of ks) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(`${etiq} : ${k} ${court(a[k])} → ${court(b[k])}`);
  };
  for (const e of instantane.enfants) {
    const o = (av.enfants ?? []).find((x: Ligne) => x.id === e.id);
    if (!o) { diffs.push(`${e.prenom} : enfant nouveau`); continue; }
    champs(o, e, ['photo_path', 'updated_at', 'affichage'], `${e.prenom} children`);
    for (const a of e.annees) { const oa = o.annees.find((x: Ligne) => x.id === a.id); if (oa) champs(oa, a, ['photo_path', 'updated_at'], `${e.prenom} année ${a.annee}`); else diffs.push(`${e.prenom} : année ${a.annee} nouvelle`); }
    for (const ob of e.objets) { const oo = o.objets.find((x: Ligne) => x.name === ob.name); if (!oo) diffs.push(`${e.prenom} : objet AJOUTÉ ${court(ob.name)} (${ob.taille} octets)`); else champs(oo, ob, ['taille', 'created_at', 'updated_at', 'version', 'etag'], `${e.prenom} objet ${court(ob.name)}`); }
    for (const oo of o.objets) if (!e.objets.some((x: Ligne) => x.name === oo.name)) diffs.push(`${e.prenom} : objet SUPPRIMÉ ${court(oo.name)}`);
  }
  if (JSON.stringify(av.orphelins) !== JSON.stringify(instantane.orphelins)) diffs.push(`orphelins : ${JSON.stringify(av.orphelins.map(court))} → ${JSON.stringify(instantane.orphelins.map(court))}`);
  console.log(`\n══ Depuis la mesure précédente (${av.horodatage}${av.etiquette ? ` — ${av.etiquette}` : ''}) ══`);
  console.log(diffs.length ? diffs.map((d) => `  • ${d}`).join('\n') : '  (aucun changement)');
}
writeFileSync(join(DOSSIER, `${horodatage}.json`), JSON.stringify(instantane, null, 2));
console.log(`\nMesure gardée : ${join(DOSSIER, `${horodatage}.json`)}`);
