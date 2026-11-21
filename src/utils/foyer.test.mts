// Tests de la règle « modifiable par le foyer de l'auteur » (21 nov. 2026). Lancement : npm run test:foyer
import { modifiableParMonFoyer } from './foyer.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  if (obtenu === attendu) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${String(obtenu)}, attendu ${String(attendu)}`); }
}
const resp = [
  { user_id: 'sophie', foyer_id: 'F1' }, { user_id: 'marc', foyer_id: 'F1' }, { user_id: 'julien', foyer_id: 'F2' },
];
egal('Sophie, auteure', modifiableParMonFoyer('sophie', 'sophie', resp), true);
egal('Marc, même foyer', modifiableParMonFoyer('sophie', 'marc', resp), true);
egal('Julien, autre foyer', modifiableParMonFoyer('sophie', 'julien', resp), false);
egal('Sophie sur l’événement de Julien', modifiableParMonFoyer('julien', 'sophie', resp), false);
egal('auteur inconnu', modifiableParMonFoyer(null, 'julien', resp), true);
egal('auteur parti', modifiableParMonFoyer('ancien', 'julien', resp), true);
egal('sans compte', modifiableParMonFoyer('sophie', null, resp), false);

console.log(`foyer : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
