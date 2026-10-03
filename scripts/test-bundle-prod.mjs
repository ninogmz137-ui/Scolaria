// Preuve que la version de PRODUCTION ne contient aucun outil de développement (27 sept 2026) :
// liens scolaria://dev/…, « Passer en démo » / « Revenir à mon compte », notification de test.
// Exporte un bundle Android de production (__DEV__ faux) dans un dossier TEMPORAIRE (jamais dans le
// dépôt), puis cherche les chaînes en UTF-8 et en UTF-16 (Hermes stocke les chaînes accentuées en UTF-16).
//   npm run test:bundle-prod

import { execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dossier = mkdtempSync(join(tmpdir(), 'scolaria-prod-'));
try {
  execSync(`npx expo export --platform android --output-dir "${dossier}"`, { stdio: 'ignore' });
  const js = join(dossier, '_expo', 'static', 'js', 'android');
  const bundle = Buffer.concat(readdirSync(js).map((f) => readFileSync(join(js, f))));
  const compte = (t) => {
    const chercher = (aiguille) => {
      let n = 0;
      for (let i = bundle.indexOf(aiguille); i !== -1; i = bundle.indexOf(aiguille, i + 1)) n++;
      return n;
    };
    return chercher(Buffer.from(t, 'utf8')) + chercher(Buffer.from(t, 'utf16le'));
  };

  const interdits = ['dev/demo', 'dev/reel', 'dev/notif-mot', 'rafraichir-session', 'Passer en démo', 'Revenir à mon compte'];
  // Témoins : le test sait lire le bundle (chaînes ASCII et accentuées).
  const temoins = ['mot_expediteur', 'Se déconnecter', 'Ajouter un mot reçu ailleurs'];

  let echecs = 0;
  for (const t of temoins) {
    const ok = compte(t) > 0;
    console.log(`${ok ? 'OK ' : 'ÉCHEC'} témoin présent : « ${t} »`);
    if (!ok) echecs++;
  }
  for (const t of interdits) {
    const ok = compte(t) === 0;
    console.log(`${ok ? 'OK ' : 'ÉCHEC'} absent de la production : « ${t} »`);
    if (!ok) echecs++;
  }
  console.log(echecs === 0 ? `── ${temoins.length + interdits.length}/${temoins.length + interdits.length} ──` : `── ${echecs} échec(s) ──`);
  process.exitCode = echecs === 0 ? 0 : 1;
} finally {
  rmSync(dossier, { recursive: true, force: true });
}
