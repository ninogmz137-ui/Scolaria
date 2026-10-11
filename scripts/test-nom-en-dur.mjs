// TEST DE GARDE « aucun nom en dur » : échoue si le nom de l'application (« Scolaria », « Theka ») ou le nom de l'assistant (« Aria »)
// apparaît dans un LITTÉRAL DE CHAÎNE ou un TEXTE JSX (textes affichés, libellés d'accessibilité, traductions, e-mails, messages
// serveur, notifications) hors de la liste d'exceptions documentée `scripts/nom-en-dur-exceptions.json`.
//
// Méthode : chaque fichier de `src/`, `supabase/functions/` et `app.config.js` est analysé avec l'API TypeScript (jamais une
// recherche de texte : les commentaires, noms de variables et de composants ne comptent pas). Les exceptions sont des motifs avec un
// NOMBRE EXACT d'occurrences par fichier et une raison : une occurrence de plus échoue (nouveau nom en dur), une de moins échoue aussi
// (exception périmée à retirer). Tout nouveau texte doit passer par marque.json (NOM_APP, ASSISTANT).
//
// Usage : node scripts/test-nom-en-dur.mjs            (test)
//         node scripts/test-nom-en-dur.mjs --lister   (affiche tous les littéraux concernés, par fichier)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOMS = /scolaria|theka|\baria\b/i;
const lister = process.argv.includes('--lister');
const exceptions = JSON.parse(fs.readFileSync(path.join(racine, 'scripts', 'nom-en-dur-exceptions.json'), 'utf8')).exceptions;

function* fichiers(dossier) {
  const p = path.join(racine, dossier);
  if (!fs.existsSync(p)) return;
  const pile = [p];
  while (pile.length) {
    const d = pile.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.expo') continue;
      const c = path.join(d, e.name);
      if (e.isDirectory()) pile.push(c);
      else if (/\.(ts|tsx|js)$/.test(e.name) && !/\.test\.m?ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) yield c;
    }
  }
}

/** Littéraux de chaîne et textes JSX d'un fichier : [{ ligne, texte }]. */
function litteraux(fichier) {
  const code = fs.readFileSync(fichier, 'utf8');
  const sf = ts.createSourceFile(fichier, code, ts.ScriptTarget.Latest, true, /\.tsx$/.test(fichier) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const ajouter = (noeud, texte) => {
    if (!NOMS.test(texte)) return;
    const { line } = sf.getLineAndCharacterOfPosition(noeud.getStart(sf));
    out.push({ ligne: line + 1, texte: texte.replace(/\s+/g, ' ').trim() });
  };
  const visiter = (n) => {
    // Les chemins de modules (import / export / require) ne sont pas des textes affichés.
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) return;
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'require') return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ajouter(n, n.text);
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) ajouter(n, n.text);
    else if (ts.isJsxText(n)) ajouter(n, n.text);
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  return out;
}

const relatif = (f) => path.relative(racine, f).split(path.sep).join('/');
const toutes = [];
for (const dossier of ['src', 'supabase/functions']) for (const f of fichiers(dossier)) toutes.push(f);
toutes.push(path.join(racine, 'app.config.js'));

const parFichier = new Map();
for (const f of toutes) {
  const l = litteraux(f);
  if (l.length) parFichier.set(relatif(f), l);
}

if (lister) {
  let n = 0;
  for (const [f, l] of [...parFichier.entries()].sort()) {
    console.log(`\n## ${f} (${l.length})`);
    for (const x of l) console.log(`  ${x.ligne}: ${JSON.stringify(x.texte.slice(0, 140))}`);
    n += l.length;
  }
  console.log(`\nTOTAL ${n} littéral(aux) dans ${parFichier.size} fichier(s)`);
  process.exit(0);
}

// ── Application des exceptions ───────────────────────────────────────────────────────────────────────────────────
let ok = 0;
let echecs = 0;
const verifier = (nom, cond, detail = '') => {
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` — ${detail}`}`);
  cond ? ok++ : echecs++;
};
const couverts = new Map(); // "fichier|ligne|texte" -> index d'exception
for (const [i, ex] of exceptions.entries()) {
  const re = new RegExp(ex.motif); // sensible à la casse : « Aria » (route) et « aria » (valeur interne) sont deux exceptions distinctes
  const l = (parFichier.get(ex.fichier) ?? []).filter((x) => re.test(x.texte));
  verifier(`exception « ${ex.raison.slice(0, 60)} » (${ex.fichier}) : ${ex.nombre} occurrence(s) attendue(s)`, l.length === ex.nombre, `${l.length} trouvée(s)${l.length ? ' : ' + l.map((x) => `${x.ligne}`).join(', ') : ''}`);
  for (const x of l) couverts.set(`${ex.fichier}|${x.ligne}|${x.texte}`, i);
}
const nonCouverts = [];
for (const [f, l] of parFichier) for (const x of l) if (!couverts.has(`${f}|${x.ligne}|${x.texte}`)) nonCouverts.push(`${f}:${x.ligne} ${JSON.stringify(x.texte.slice(0, 110))}`);
verifier('aucun nom d\'application ni d\'assistant en dur hors exceptions documentées', nonCouverts.length === 0, `\n    ${nonCouverts.join('\n    ')}`);

// Contre-épreuve : le détecteur voit bien un nom en dur (sinon le test ne prouverait rien).
{
  const sf = ts.createSourceFile('essai.tsx', "const a = 'Scolaria'; const b = `bonjour ${x} Aria`; const c = <Text>Theka</Text>;", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let trouves = 0;
  const v = (n) => {
    if (ts.isStringLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) if (NOMS.test(n.text)) trouves++;
    ts.forEachChild(n, v);
  };
  v(sf);
  verifier('témoin : le détecteur voit un nom dans une chaîne, un gabarit et un texte JSX', trouves === 3, `${trouves}/3`);
}
console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
