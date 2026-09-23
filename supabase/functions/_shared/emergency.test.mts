/**
 * Tests du protocole d'urgence — `npm run test:emergency` (Node 22+, exécute le TypeScript).
 * Toute modification des motifs de emergency.ts doit garder ce fichier au vert.
 */
import { detectEmergency, EMERGENCY_MESSAGE, type EmergencyCategory } from './emergency.ts';

const CASES: [string, EmergencyCategory | null][] = [
  // Doivent déclencher
  ["Léa dit qu'elle veut mourir", 'suicide'],
  ['Il parle de se suicider', 'suicide'],
  ["Elle n'a plus envie de vivre", 'suicide'],
  ['Mon fils se scarifie', 'suicide'],
  ["Il m'a dit qu'il avait envie d'en finir", 'suicide'],
  ['Elle veut en finir avec la vie', 'suicide'],
  ['Il répète « je veux me tuer »', 'suicide'],
  ['Il parle de se tuer', 'suicide'],
  ['Emma est harcelée au collège', 'harcelement'],
  ['on le RACKETTE à la sortie', 'harcelement'],
  ['Elle subit du cyberharcèlement', 'harcelement'],
  ['son beau-père le frappe', 'maltraitance'],
  ['elle a été violée', 'maltraitance'],
  ['Il a subi des attouchements', 'maltraitance'],
  // Pièges : ne doivent PAS déclencher
  ['Lucas joue du violon', null],
  ['un film violent', null],
  ['la robe violette', null],
  ['ces devoirs vont me tuer', null],
  ['ce contrôle va me tuer', null],
  ['en finir avec les devoirs', null],
  ['Comment vont les notes en maths ?', null],
  ["Prépare le contrôle d'histoire", null],
];

let failures = 0;
for (const [text, expected] of CASES) {
  const got = detectEmergency(text);
  const pass = got === expected;
  if (!pass) failures++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${JSON.stringify(text)} → ${got}${pass ? '' : ` (attendu : ${expected})`}`);
}

// Le message fixe doit toujours contenir les numéros du protocole, et jamais l'ancien 3020.
for (const number of ['3114', '3018', '119', '112']) {
  if (!EMERGENCY_MESSAGE.includes(number)) {
    failures++;
    console.log(`FAIL message d'urgence sans le ${number}`);
  }
}
if (EMERGENCY_MESSAGE.includes('3020')) {
  failures++;
  console.log('FAIL message d’urgence contient le 3020 (hors service depuis 2024)');
}

console.log(`\n${CASES.length} cas, ${failures} échec(s)`);
process.exit(failures ? 1 : 0);
