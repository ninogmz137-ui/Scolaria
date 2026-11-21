// En-tête du carnet : courbe du fondu et contrastes AA des textes posés dessus, sur les 6 couleurs d'enfant.
// npm run test:entete
import { FONDU_ACCUEIL, opaciteFondu, tonSurFondu } from './fondu.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, bon: boolean, detail = '') {
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : ${detail}`}`);
  if (bon) ok++;
  else echecs++;
}

const COULEURS: Record<string, string> = {
  Indigo: '#4338CA', Océan: '#0369A1', Sarcelle: '#0F766E', Framboise: '#BE185D', Ardoise: '#334155', Pierre: '#57534E',
};
const PAGE: [number, number, number] = [0xf2, 0xf1, 0xee];
const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v * (1 - t) + b[i] * t) as [number, number, number];
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contraste = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Courbe
verifier('opacité 1 en haut, 0 au bas du fondu', opaciteFondu(0, 380) === 1 && opaciteFondu(380, 380) === 0);
verifier('plein jusqu\'à 40 % de la hauteur', opaciteFondu(0.4 * 380, 380) === 1);
verifier('ton clair tant que l\'opacité ≥ 0,6, foncé ensuite', tonSurFondu(100, 380) === 'clair' && tonSurFondu(300, 380) === 'fonce' && tonSurFondu(380, 380) === null);

// Géométrie de la ligne d'identité (lot 6, COMPONENTS §18.3) : haut = insets.top + 64 ; rond 52 ; colonne de texte centrée
// sur le rond : prénom 24 (ligne 28) → bas à +32, ligne « classe · enseignant · école » 13 (ligne 17) → bas à +50 ;
// fondu = insets.top + FONDU_ACCUEIL (fondu.ts). Chaque texte est évalué à SON ordonnée. Barres d'état de 24 à 56 dp.
const HAUT = 64;
const BAS_PRENOM = 32;
const BAS_LIGNE = 50;
const FONDU = FONDU_ACCUEIL;
for (const top of [24, 32, 40, 48, 56]) {
  const op = (dy: number) => opaciteFondu(top + HAUT + dy, top + FONDU);
  for (const [nom, c] of Object.entries(COULEURS)) {
    const fondA = (dy: number) => mix(PAGE, hex(c), op(dy));
    const ligne = contraste(mix(fondA(BAS_LIGNE), [255, 255, 255], 0.95), fondA(BAS_LIGNE));
    const prenom = contraste([255, 255, 255], fondA(BAS_PRENOM));
    if (!(ligne >= 4.5 && prenom >= 3)) {
      verifier(`barre d'état ${top} dp, ${nom}`, false, `ligne ${ligne.toFixed(2)} prénom ${prenom.toFixed(2)} `);
    }
  }
}
verifier('contrastes AA (ligne 13 px, prénom 24 px) sur les 6 couleurs d\'enfant, barres d\'état de 24 à 56 dp', echecs === 0);

// Hauteur de l'en-tête (prompt du 16 nov.) : la 1re carte commence au plus tard à 30 % de l'écran. Haut de carte = insets.top
// + 64 + 52 (rond) + 16 (marge) + 44 (libellé de section « À faire ») ; écran du Redmi = 873 dp, petit écran = 690 dp.
for (const [ecran, top] of [[873, 32], [690, 24]] as const) {
  const hautCarte = top + 64 + 52 + 16 + 44;
  verifier(`1re carte à ${(100 * hautCarte / ecran).toFixed(0)} % d'un écran de ${ecran} dp (≤ 30 %)`, hautCarte <= 0.3 * ecran, String(hautCarte));
}

// Contre-épreuve : le voile BLANC à 22 % demandé d'abord ne passe PAS (c'est pourquoi le voile est sombre).
const pireBlanc22 = Math.min(...Object.values(COULEURS).map((c) => contraste([255, 255, 255], mix(hex(c), [255, 255, 255], 0.22))));
verifier('témoin : pilule à voile blanc 22 % sous 4,5 (refusée)', pireBlanc22 < 4.5, pireBlanc22.toFixed(2));

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
