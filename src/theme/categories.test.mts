// Teintes de catégorie : couverture des référentiels officiels, contraste AA, interdits. npm run test:categories
import { DOMAINES_CYCLE_1 } from '../data/referentiels/cycle1.ts';
import { DISCIPLINES_CYCLE_2 } from '../data/referentiels/cycle2.ts';
import { DISCIPLINES_CYCLE_3 } from '../data/referentiels/cycle3.ts';
import {
  DISCIPLINES, INSTITUTION, TEINTES, TYPES_CONTENU, categorieDiscipline, idDiscipline,
  type Categorie, type TeinteId,
} from './categories.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, bon: boolean, detail = '') {
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : ${detail}`}`);
  if (bon) ok++;
  else echecs++;
}

// Contraste WCAG (fond opaque ; l'indigo à 10 % est composé sur le fond de page #F2F1EE).
function rgb(c: string): [number, number, number] {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as [number, number, number];
  const r = c.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/)!;
  const a = Number(r[4]);
  const page = [0xf2, 0xf1, 0xee];
  return [0, 1, 2].map((i) => Math.round(Number(r[i + 1]) * a + page[i] * (1 - a))) as [number, number, number];
}
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contraste = (a: string, b: string) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
for (const [nom, t] of Object.entries(TEINTES)) {
  const c = contraste(t.fond, t.icone);
  verifier(`contraste AA de la teinte ${nom} (≥ 4,5)`, c >= 4.5, c.toFixed(2));
}

// Aucune teinte verte ni rouge (interdit sur toute donnée).
verifier('six teintes exactement, aucun vert ni rouge', Object.keys(TEINTES).sort().join() === 'action,ambre,ardoise,ciel,orange,rose');

// Toutes les catégories pointent une teinte existante.
const toutes: Categorie[] = [...Object.values(DISCIPLINES), ...Object.values(TYPES_CONTENU), INSTITUTION];
verifier('toute catégorie pointe une teinte existante', toutes.every((c) => c.teinte in TEINTES));

// Valeurs du sprint.
const attendu: Record<string, [TeinteId, string]> = {
  francais: ['ambre', 'message-circle'], maths: ['orange', 'shapes'], monde: ['ardoise', 'compass'], emc: ['ardoise', 'scale'],
  'langue-vivante': ['ambre', 'languages'], arts: ['rose', 'palette'], eps: ['ciel', 'activity'], inconnu: ['ardoise', 'book-open'],
};
for (const [id, [teinte, icone]] of Object.entries(attendu)) {
  const c = (DISCIPLINES as Record<string, Categorie>)[id];
  verifier(`discipline ${id} : ${teinte} + ${icone}`, c.teinte === teinte && c.icone === icone);
}

// Types : jamais une teinte de discipline (ambre, ciel, rose, orange) ; indigo seulement pour les actions.
verifier('types de contenu : jamais de teinte de discipline',
  Object.values(TYPES_CONTENU).every((c) => c.teinte === 'action' || c.teinte === 'ardoise'));
verifier('mot / autorisation / à répondre = action + pencil',
  (['mot', 'autorisation', 'a-repondre'] as const).every((k) => TYPES_CONTENU[k].teinte === 'action' && TYPES_CONTENU[k].icone === 'pencil'));
verifier('photo, souvenir, livret, document, à prévoir = ardoise',
  (['photo', 'souvenir', 'livret', 'document', 'a-prevoir'] as const).every((k) => TYPES_CONTENU[k].teinte === 'ardoise'));
verifier('école / direction / mairie = ardoise + building-2', INSTITUTION.teinte === 'ardoise' && INSTITUTION.icone === 'building-2');

// Couverture : chaque libellé officiel des référentiels a un identifiant (sinon : relevé pour le rapport).
const officiels = [...DOMAINES_CYCLE_1, ...DISCIPLINES_CYCLE_2, ...DISCIPLINES_CYCLE_3];
const sansId = officiels.filter((l) => idDiscipline(l) === 'inconnu');
verifier(`les ${officiels.length} libellés officiels ont un identifiant`, sansId.length === 0, sansId.join(' | '));

// Noms courts rencontrés dans l'agenda de démo (emploi du temps, devoirs) : tous couverts.
const courts = ['Français', 'Mathématiques', 'Histoire-Géo', 'Anglais', 'Sciences', 'EPS', 'Arts', 'Musique', 'Explorer le monde'];
const courtsSansId = courts.filter((l) => idDiscipline(l) === 'inconnu');
verifier('noms courts de l\'agenda de démo couverts', courtsSansId.length === 0, courtsSansId.join(' | '));

// Mêmes teintes pour un même identifiant, quel que soit le cycle.
verifier('Français (cycles 2 et 3) et domaine de langage (cycle 1) : même teinte',
  idDiscipline('Français') === idDiscipline(DOMAINES_CYCLE_1[0]));
verifier('Mathématiques (cycle 2) = premiers outils mathématiques (cycle 1)',
  idDiscipline('Mathématiques') === idDiscipline(DOMAINES_CYCLE_1[3]));
verifier('apostrophe droite ou courbe, accents et casse indifférents',
  idDiscipline("Agir, s'exprimer, comprendre à travers les activités PHYSIQUES") === 'eps');

// Inconnu : jamais d'erreur.
for (const l of ['', 'Discipline inventée', null, undefined]) {
  const c = categorieDiscipline(l as string);
  verifier(`libellé inconnu (${JSON.stringify(l)}) → ardoise + book-open`, c.teinte === 'ardoise' && c.icone === 'book-open');
}

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
