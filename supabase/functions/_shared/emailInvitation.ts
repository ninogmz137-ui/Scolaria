/**
 * Email d'invitation d'un second responsable (L4) — construction PURE (testée sous Node :
 * `npm run test:email-invitation`). Aucun nom de famille, aucun identifiant : prénoms seulement.
 */

import { NOM_APP } from './marque.ts';

export interface DonneesInvitation {
  prenomInvitant: string;
  prenomEnfant: string;
  expireLe: string; // ISO
}

export interface EmailInvitation {
  sujet: string;
  texte: string;
  html: string;
}

function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateFr(iso: string): string {
  const d = new Date(iso);
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${d.getUTCDate()} ${mois[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function construireEmailInvitation(d: DonneesInvitation): EmailInvitation {
  const invitant = d.prenomInvitant.trim() || 'Un responsable';
  const enfant = d.prenomEnfant.trim();
  const sujet = `${invitant} vous invite à suivre le carnet de ${enfant}`;
  const lignes = [
    'Bonjour,',
    '',
    `${invitant} vous invite à suivre le carnet de scolarité de ${enfant} sur ${NOM_APP}.`,
    '',
    'Pour accepter :',
    `1. Ouvrez l’app ${NOM_APP} sur votre téléphone.`,
    '2. Connectez-vous, ou créez votre compte AVEC CETTE ADRESSE EMAIL, puis confirmez-la.',
    '3. L’invitation s’affiche : touchez « Accepter ».',
    '',
    `Cette invitation est valable jusqu’au ${dateFr(d.expireLe)}.`,
    `Si vous ne connaissez pas ${invitant}, ignorez simplement cet email : rien ne sera partagé.`,
    '',
    NOM_APP,
  ];
  const texte = lignes.join('\n');
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0F172A">' +
    lignes
      .map((l) => (l === '' ? '<br>' : `<p style="margin:0">${echapper(l)}</p>`))
      .join('') +
    '</div>';
  return { sujet, texte, html };
}
