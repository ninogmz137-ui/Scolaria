// Tests de construireEmailInvitation (L4). Lancer : npm run test:email-invitation
import { construireEmailInvitation } from './emailInvitation.ts';
import { NOM_APP } from './marque.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const e = construireEmailInvitation({ prenomInvitant: 'Claire', prenomEnfant: 'Léa', expireLe: '2026-10-05T10:00:00Z' });
verifier('sujet : « Claire vous invite à suivre le carnet de Léa »', e.sujet === 'Claire vous invite à suivre le carnet de Léa', e.sujet);
verifier('le nom de l’app vient de NOM_APP', e.texte.includes(`sur ${NOM_APP}.`));
verifier('consigne : créer le compte avec CETTE adresse', /AVEC CETTE ADRESSE EMAIL/.test(e.texte));
verifier('date d’expiration en français', e.texte.includes('5 octobre 2026'), e.texte);
verifier('mention « ignorez » (inconnu)', e.texte.includes('Si vous ne connaissez pas Claire'));
verifier('aucun lien cliquable (pas de page encore, D5)', !/https?:\/\//.test(e.texte + e.html));
const piege = construireEmailInvitation({ prenomInvitant: '<b>X</b>', prenomEnfant: 'A&B', expireLe: '2026-10-05T10:00:00Z' });
verifier('HTML échappé (pas d’injection)', !piege.html.includes('<b>X</b>') && piege.html.includes('&lt;b&gt;X&lt;/b&gt;'));
verifier('invitant sans prénom → « Un responsable »', construireEmailInvitation({ prenomInvitant: ' ', prenomEnfant: 'Léa', expireLe: '2026-10-05T10:00:00Z' }).sujet.startsWith('Un responsable vous invite'));

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
