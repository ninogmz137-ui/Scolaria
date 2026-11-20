// Tests de dimensionsCibles (L5). Lancer : npm run test:photo
import { dimensionsCibles, COTE_MAX_PHOTO } from './redimension.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`}`);
  if (bon) ok++;
  else echecs++;
}

verifier('photo iPhone paysage 4032×3024 → largeur 2048', dimensionsCibles(4032, 3024), { width: 2048 });
verifier('photo iPhone portrait 3024×4032 → hauteur 2048', dimensionsCibles(3024, 4032), { height: 2048 });
verifier('carré 5000×5000 → largeur 2048', dimensionsCibles(5000, 5000), { width: 2048 });
verifier('capture 1080×2400 → hauteur 2048', dimensionsCibles(1080, 2400), { height: 2048 });
verifier('déjà petite 1600×1200 → rien', dimensionsCibles(1600, 1200), null);
verifier('pile à la limite 2048×1536 → rien', dimensionsCibles(2048, 1536), null);
verifier('dimensions inconnues (0) → rien', dimensionsCibles(0, 0), null);
verifier('dimensions invalides (NaN) → rien', dimensionsCibles(NaN, 100), null);
verifier('max personnalisé 1000', dimensionsCibles(3000, 2000, 1000), { width: 1000 });
verifier('constante = 2048', COTE_MAX_PHOTO, 2048);

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
