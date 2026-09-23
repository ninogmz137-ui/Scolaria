/**
 * Tests du protocole d'urgence — `npm run test:emergency` (Node 22+, exécute le TypeScript).
 * Toute modification des motifs de emergency.ts doit garder ce fichier au vert.
 */
import { buildEmergencyMessage, detectEmergency, type EmergencyCategory } from './emergency.ts';

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

// Message fixe : tous les numéros, celui de la catégorie en premier, 112 en dernier, jamais le 3020.
const FIRST: Record<EmergencyCategory, string> = { suicide: '3114', harcelement: '3018', maltraitance: '119' };
for (const category of Object.keys(FIRST) as EmergencyCategory[]) {
  const message = buildEmergencyMessage(category);
  const order = ['3114', '3018', '119', '112'].map((n) => [n, message.indexOf(n)] as const);
  const missing = order.filter(([, i]) => i < 0).map(([n]) => n);
  const firstNumber = order.filter(([n]) => n !== '112').sort((a, b) => a[1] - b[1])[0][0];
  const lastIs112 = order.every(([n, i]) => n === '112' || i < message.lastIndexOf('112'));
  const checks: [boolean, string][] = [
    [missing.length === 0, `numéros manquants : ${missing.join(', ')}`],
    [firstNumber === FIRST[category], `premier numéro ${firstNumber} au lieu de ${FIRST[category]}`],
    [lastIs112, '112 pas en dernier'],
    [!message.includes('3020'), 'contient le 3020 (hors service depuis 2024)'],
  ];
  for (const [ok, label] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} message « ${category} » : ${ok ? 'conforme' : label}`);
  }
}

console.log(`\n${CASES.length} cas, ${failures} échec(s)`);
process.exit(failures ? 1 : 0);
