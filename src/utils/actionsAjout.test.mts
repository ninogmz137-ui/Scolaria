// npm run test:actions-ajout — feuille « Ajouter » du « + » unique (lot 5).
import { actionsAjout } from './actionsAjout.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}
const egal = (a: string[], b: string[]) => a.join(',') === b.join(',');
const BASE = ['photo', 'capture', 'document', 'jalon', 'agenda', 'absence', 'message'];

verifier('Accueil, avec classe : sept actions dans l’ordre de base', egal(actionsAjout('Accueil', true), BASE), actionsAjout('Accueil', true));
verifier('Scolarité, avec classe : même ordre que l’Accueil', egal(actionsAjout('Notes', true), BASE), actionsAjout('Notes', true));
verifier('Agenda : absence puis agenda en tête', egal(actionsAjout('Agenda', true), ['absence', 'agenda', 'photo', 'capture', 'document', 'jalon', 'message']), actionsAjout('Agenda', true));
verifier('Messages : écrire en tête', egal(actionsAjout('MessagerieTab', true), ['message', 'photo', 'capture', 'document', 'jalon', 'agenda', 'absence']), actionsAjout('MessagerieTab', true));
for (const o of ['Accueil', 'Notes', 'Agenda', 'MessagerieTab'] as const) {
  const sans = actionsAjout(o, false);
  verifier(`${o}, sans classe : ni absence ni message`, !sans.includes('absence') && !sans.includes('message') && sans.length === 5, sans);
  verifier(`${o} : aucune action en double`, new Set(actionsAjout(o, true)).size === 7);
}
verifier('Agenda sans classe : agenda en tête', actionsAjout('Agenda', false)[0] === 'agenda', actionsAjout('Agenda', false));
verifier('Messages sans classe : l’ordre de base sans les deux', egal(actionsAjout('MessagerieTab', false), ['photo', 'capture', 'document', 'jalon', 'agenda']));

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
