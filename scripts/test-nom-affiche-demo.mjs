// Parcourt la VARIANTE DÉMO (version web, serveur LOCAL déjà lancé avec APP_VARIANT=demo) et vérifie qu'AUCUN texte affiché ne contient
// « Scolaria » ni « Theka » : texte visible, libellés d'accessibilité, titre, info-bulles, champs, texte des logos SVG.
// Écrans : ouverture, Accueil (haut et bas), Suivi, Agenda, Messages, Famille & paramètres (+ À propos si présent).
// Captures PNG (390 × 852, format téléphone) HORS dépôt : C:\Users\admin\ScolariaBackups\captures-demo-web-AAAA-MM-JJ\
//   1. APP_VARIANT=demo APP_LIBELLE_DEMO="Carnet Démo" EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY= node node_modules/expo/bin/cli start --web --port 8083
//   2. node scripts/test-nom-affiche-demo.mjs [http://localhost:8083]
// Garde d'hôte : l'URL doit être locale (aucun accès à un serveur hébergé).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { exigerHoteLocal } from './garde-hote.mjs';
import { refuserDansDepot } from './garde-destination.mjs';

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_APP = process.argv[2] ?? 'http://localhost:8083';
exigerHoteLocal(URL_APP);
const d = new Date();
const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DEST = `C:\\Users\\admin\\ScolariaBackups\\captures-demo-web-${jour}`;
refuserDansDepot(DEST, depot, 'le dossier des captures');
fs.mkdirSync(DEST, { recursive: true });

const NOMS = /scolaria|theka/i;
export const contientUnNom = (s) => NOMS.test(String(s).replace(/ı/g, 'i').replace(/✦/g, ''));
let echecs = 0;
const ok = (c, m) => {
  console.log(`${c ? 'OK    ' : 'ECHEC '} ${m}`);
  if (!c) echecs++;
};
// Dents du contrôle : le détecteur reconnaît les noms, y compris le logo en lettres séparées.
ok(contientUnNom('Bienvenue sur Scolaria') && contientUnNom('THEKA') && contientUnNom('Scolar') === false && contientUnNom('Scolar' + 'ı' + 'a' + '✦'), 'témoin : le détecteur reconnaît les noms (texte, majuscules, logo en lettres séparées)');

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('ni Chrome ni Edge trouvés');
const PORT = 9333;
const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-profil-'));
const nav = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, '--hide-scrollbars', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let cible;
for (let i = 0; i < 40 && !cible; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    cible = l.find((t) => t.type === 'page');
  } catch { /* le navigateur démarre */ }
  if (!cible) await attendre(500);
}
if (!cible) throw new Error('navigateur sans page');
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((r) => ws.once('open', r));
let n = 0;
const attente = new Map();
ws.on('message', (m) => {
  const j = JSON.parse(m);
  if (j.id && attente.has(j.id)) { attente.get(j.id)(j); attente.delete(j.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; attente.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evalue = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? ''));
  return r.result?.result?.value;
};
await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 852, deviceScaleFactor: 2, mobile: true });
await cdp('Page.navigate', { url: URL_APP });

const COLLECTE = `(() => {
  const s = new Set(); s.add(document.title); s.add(document.body.innerText);
  document.querySelectorAll('*').forEach((e) => { for (const a of ['aria-label','title','placeholder','alt','aria-description','value']) { const v = e.getAttribute && e.getAttribute(a); if (v) s.add(v); } });
  document.querySelectorAll('svg').forEach((v) => s.add([...v.querySelectorAll('text')].map((t) => t.textContent).join('')));
  return [...s];
})()`;
const CLIQUE = (cible) => `(() => {
  const c = ${JSON.stringify(cible)};
  const e = [...document.querySelectorAll('[role=button],[role=tab],button,a,div,span')].filter((x) => x.getAttribute('aria-label') === c || (x.innerText && x.innerText.trim() === c)).pop();
  if (!e) return false; e.click(); return true;
})()`;
const DEFILER_BAS = `(() => {
  const c = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 80 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  if (!c) return false; c.scrollTop = c.scrollHeight; return c.scrollHeight;
})()`;
let numero = 0;
async function ecran(nom, { clic, defiler, attendu = [] } = {}) {
  if (clic) ok(await evalue(CLIQUE(clic)), `${nom} : « ${clic} » trouvé et activé`);
  await attendre(3000);
  if (defiler) { await evalue(DEFILER_BAS); await attendre(1200); }
  const chaines = await evalue(COLLECTE);
  const hits = chaines.filter(contientUnNom);
  ok(hits.length === 0, `${nom} : ${chaines.length} chaînes affichées (texte, libellés, titre, logos), aucun nom « Scolaria » / « Theka »${hits.length ? ' — TROUVÉ : ' + hits.map((h) => String(h).slice(0, 80)).join(' | ') : ''}`);
  const tout = chaines.join('\n');
  for (const a of attendu) ok(tout.includes(a), `${nom} : contient « ${a} »`);
  const png = (await cdp('Page.captureScreenshot', { format: 'png' })).result.data;
  const f = path.join(DEST, `${String(++numero).padStart(2, '0')}-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
  fs.writeFileSync(f, Buffer.from(png, 'base64'));
  return tout;
}

await attendre(process.argv.includes('--contre-epreuve') ? 45000 : 12000); // chargement du bundle
if (process.argv.includes('--contre-epreuve')) {
  // Contre-épreuve : contre un serveur SANS variante, le test doit TROUVER le nom (preuve qu'il sait le voir). Ouverture seulement.
  const chaines = await evalue(COLLECTE);
  const hits = chaines.filter(contientUnNom);
  ok(hits.length > 0, `contre-épreuve (serveur sans variante) : le nom est détecté à l'ouverture (${hits.length} chaîne(s) : ${hits.map((h) => JSON.stringify(String(h).slice(0, 40))).join(' ')})`);
  try { ws.close(); } catch { /* fin */ }
  nav.kill();
  process.exit(echecs ? 1 : 0);
}
await ecran('Ouverture', { attendu: ['Carnet Démo', 'Essayer en mode démo', 'Une famille fictive, aucune donnée réelle.'] });
{
  const t = await evalue(COLLECTE);
  ok(!t.join('\n').includes('Se connecter') && !t.join('\n').includes('Créer un compte'), 'Ouverture : ni « Se connecter » ni « Créer un compte »');
}
await ecran('Accueil', { clic: 'Essayer en mode démo' });
await ecran('Accueil bas', { defiler: true, attendu: ['Démonstration : famille et données fictives.'] });
await ecran('Suivi', { clic: 'Suivi' });
await ecran('Agenda', { clic: 'Agenda' });
await ecran('Messages', { clic: 'Messages' });
const fam = await ecran('Famille et paramètres', { clic: 'Famille et paramètres', attendu: ['Mode démo'] });
if (await evalue(CLIQUE('À propos'))) await ecran('A propos');
else console.log('INFO   À propos : entrée non trouvée à l\'écran (non parcouru)');

try { ws.close(); } catch { /* fin */ }
nav.kill();
await attendre(800);
try { fs.rmSync(profil, { recursive: true, force: true }); } catch { /* verrou Windows : profil temporaire laissé dans %TEMP% */ }
console.log(`Captures : ${DEST}`);
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nNOM AFFICHÉ : aucun « Scolaria » ni « Theka » à l\'écran dans la variante démo.');
process.exit(echecs ? 1 : 0);
