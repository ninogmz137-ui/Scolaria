/**
 * Garde-fou des journaux des Edge Functions — `npm run test:journaux` (Node 22+).
 *
 * Incident du 23 sept 2026 : une erreur « Invalid header value » a recopié la clé Anthropic dans les
 * journaux de la fonction. Ce test lit le code source de supabase/functions/ (hors tests) et échoue si
 * un appel console.* peut écrire autre chose qu'un texte fixe + des champs autorisés :
 *  - 1er argument : un texte littéral, sans interpolation ;
 *  - 2e argument (facultatif) : un objet littéral dont les clés sont dans CLES_AUTORISEES et dont les
 *    valeurs n'utilisent ni la clé, ni les en-têtes, ni la requête, ni le corps, ni l'erreur brute ;
 *  - jamais plus de 2 arguments ;
 *  - tout `new Anthropic(` coupe les journaux internes du SDK (logLevel: 'off').
 * Le test se vérifie aussi lui-même sur des exemples interdits (ils doivent être refusés).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(import.meta.dirname, '..');
const CLES_AUTORISEES = new Set(['category', 'user', 'model', 'stop_reason', 'status', 'type', 'name']);
const VALEUR_INTERDITE = [
  /\b(apiKey|ANTHROPIC_API_KEY|authHeader|headers|req|request|body|system|messages|lastUserMessage|client|text)\b/,
  /\berror\.(message|headers|error|request|response|cause|stack)\b/,
  /\bJSON\.stringify\b|\bString\(|\.\.\./,
];

/** Arguments (texte brut) de chaque appel console.* du source. */
function appelsConsole(source: string): string[] {
  const appels: string[] = [];
  const re = /console\.(log|info|warn|error|debug)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let i = re.lastIndex, prof = 1, chaine: string | null = null;
    for (; i < source.length && prof > 0; i++) {
      const c = source[i];
      if (chaine) { if (c === '\\') i++; else if (c === chaine) chaine = null; continue; }
      if (c === "'" || c === '"' || c === '`') chaine = c;
      else if (c === '(' || c === '{' || c === '[') prof++;
      else if (c === ')' || c === '}' || c === ']') prof--;
    }
    appels.push(source.slice(re.lastIndex, i - 1).trim());
  }
  return appels;
}

/** Découpe au premier niveau (virgules hors chaînes, parenthèses et accolades). */
function decouper(texte: string): string[] {
  const parts: string[] = [];
  let prof = 0, chaine: string | null = null, debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (chaine) { if (c === '\\') i++; else if (c === chaine) chaine = null; continue; }
    if (c === "'" || c === '"' || c === '`') chaine = c;
    else if ('({['.includes(c)) prof++;
    else if (')}]'.includes(c)) prof--;
    else if (c === ',' && prof === 0) { parts.push(texte.slice(debut, i).trim()); debut = i + 1; }
  }
  const fin = texte.slice(debut).trim();
  if (fin) parts.push(fin);
  return parts;
}

/** Raison du refus, ou null si l'appel est conforme. */
function verifier(args: string): string | null {
  const parts = decouper(args);
  if (parts.length === 0 || parts.length > 2) return `${parts.length} argument(s) (1 ou 2 attendus)`;
  const [message, champs] = parts;
  const litteral = /^'[^']*'$|^"[^"]*"$|^`[^`$]*`$/;
  if (!litteral.test(message)) return 'le 1er argument n’est pas un texte fixe';
  if (champs === undefined) return null;
  if (!/^\{[\s\S]*\}$/.test(champs)) return 'le 2e argument n’est pas un objet littéral';
  for (const paire of decouper(champs.slice(1, -1))) {
    const [cle, ...reste] = paire.split(':');
    const valeur = reste.join(':').trim();
    if (!CLES_AUTORISEES.has(cle.trim())) return `champ non autorisé : ${cle.trim()}`;
    if (valeur === 'error' || VALEUR_INTERDITE.some((re) => re.test(valeur))) return `valeur interdite : ${valeur}`;
  }
  return null;
}

let echecs = 0;
const verdict = (ok: boolean, libelle: string) => { if (!ok) echecs++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${libelle}`); };

// 1. Le vérificateur refuse bien les formes dangereuses.
const INTERDITS: string[] = [
  "'[aria] erreur', error",
  "'[aria] erreur', { error }",
  "'[aria] erreur', { message: error.message }",
  "'[aria] erreur', { status: error.headers }",
  "`[aria] clé ${apiKey}`",
  "'[aria] requête', { user: req.headers.get('Authorization') }",
  "'[aria] corps', { type: JSON.stringify(body) }",
  "'[aria] a', { status: 1 }, apiKey",
];
for (const ex of INTERDITS) verdict(verifier(ex) !== null, `refusé : console.error(${ex})`);

// 2. Le code réel des Edge Functions.
const fichiers: string[] = [];
const parcourir = (dir: string) => {
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (/\.(ts|mts|js)$/.test(nom) && !/\.test\./.test(nom)) fichiers.push(p);
  }
};
parcourir(RACINE);

let appels = 0;
for (const f of fichiers) {
  const source = readFileSync(f, 'utf8');
  const rel = f.slice(RACINE.length + 1).replace(/\\/g, '/');
  for (const args of appelsConsole(source)) {
    appels++;
    const raison = verifier(args);
    verdict(raison === null, `${rel} : console(${args.replace(/\s+/g, ' ').slice(0, 90)})${raison ? ` → ${raison}` : ''}`);
  }
  for (const m of source.matchAll(/new Anthropic\(([^)]*)\)/g)) {
    verdict(/logLevel:\s*'off'/.test(m[1]), `${rel} : new Anthropic(${m[1]}) coupe les journaux du SDK`);
  }
}

console.log(`\n${fichiers.length} fichier(s), ${appels} appel(s) console, ${INTERDITS.length} contre-exemples, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
