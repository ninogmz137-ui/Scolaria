// npm run test:decompte-enfant — pastille de l'avatar et décompte du sélecteur (lot 5).
import { decompter, devoirsDemainNonCoches, pastilleAutresEnfants } from './decompteEnfant.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}
const vide = { motsATraiter: 0, motsASignerSeulement: 0, nonLus: 0, devoirsDemain: 0 };

const d0 = decompter(vide);
verifier('rien : « À jour », pas de pastille', d0.texte === 'À jour' && !d0.pastille, d0);
const d1 = decompter({ ...vide, motsATraiter: 1, motsASignerSeulement: 1, nonLus: 1, devoirsDemain: 1 });
verifier('« 1 mot à signer · 2 nouveautés »', d1.texte === '1 mot à signer · 2 nouveautés' && d1.pastille, d1);
const d2 = decompter({ ...vide, motsATraiter: 2, motsASignerSeulement: 1 });
verifier('une question parmi les mots : « 2 mots à traiter »', d2.texte === '2 mots à traiter', d2);
const d3 = decompter({ ...vide, devoirsDemain: 1 });
verifier('devoir pour demain non coché : pastille, « 1 nouveauté »', d3.pastille && d3.texte === '1 nouveauté', d3);
const d4 = decompter({ ...vide, nonLus: 3 });
verifier('messages non lus : « 3 nouveautés »', d4.texte === '3 nouveautés' && d4.pastille, d4);

const demain = '2026-11-23';
verifier('devoirs : seuls ceux de demain non cochés comptent',
  devoirsDemainNonCoches([
    { jour: demain, fait: false }, { jour: demain, fait: true }, { jour: '2026-11-24', fait: false }, { jour: '2026-11-22', fait: false },
  ], demain) === 1);

const m = new Map([['lina', decompter(vide)], ['tom', d3]]);
verifier('pastille : un AUTRE enfant a du nouveau', pastilleAutresEnfants(m, 'lina'));
verifier('pastille : jamais pour l’enfant affiché lui-même', !pastilleAutresEnfants(m, 'tom'));
verifier('pastille : aucun enfant', !pastilleAutresEnfants(new Map(), 'lina'));

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
