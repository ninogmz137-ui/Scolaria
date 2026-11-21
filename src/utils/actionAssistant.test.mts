// npm run test:action-assistant — assistant et enfant sans classe sur l'app (règle du 21 nov. 2026).
import { demandeVersEcole, filtrerReponseAssistant, messageEcoleAbsente } from './actionAssistant.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}

const absence = { type: 'ABSENCE', date: '2026-11-23' };
const message = { type: 'MESSAGE', conversation_id: 'c', draft: 'Bonjour' };
const notes = { type: 'NOTES' };

// 1. Enfant SANS classe : action d'absence proposée par le modèle → texte fixe, aucune action.
const r1 = filtrerReponseAssistant({ texte: 'C’est noté.', action: absence, demande: 'Laia est malade', rattache: false, prenom: 'Laia' });
verifier('sans classe : action ABSENCE retirée', r1.action === null && r1.bloquee, r1);
verifier('sans classe : texte fixe « pas encore sur l’app »', r1.texte === messageEcoleAbsente('Laia') && /pas encore sur l’app/.test(r1.texte), r1.texte);
verifier('texte fixe : élision « d’Evan »', /^L’école d’Evan /.test(messageEcoleAbsente('Evan')), messageEcoleAbsente('Evan'));
verifier('texte fixe : « de Laia », vouvoiement, rien envoyé', /^L’école de Laia /.test(messageEcoleAbsente('Laia')) && /Prévenez/.test(messageEcoleAbsente('Laia')) && /Rien n’a été envoyé/.test(messageEcoleAbsente('Laia')) && !/\b(tu|ton|ta|tes)\b/i.test(messageEcoleAbsente('Laia')));
verifier('texte fixe sans prénom : « de votre enfant »', /^L’école de votre enfant /.test(messageEcoleAbsente('')));

// 2. Action MESSAGE (écrire à l'enseignant) : bloquée aussi.
const r2 = filtrerReponseAssistant({ texte: 'Je prépare le message.', action: message, demande: 'ok', rattache: false, prenom: 'Evan' });
verifier('sans classe : action MESSAGE retirée', r2.action === null && r2.bloquee, r2);

// 3. Balises nues (ChatBubble) ou complètes dans le texte brut.
verifier('sans classe : balise nue [ACTION:ABSENCE] bloquée', filtrerReponseAssistant({ texte: 'Voici.\n[ACTION:ABSENCE]', action: null, demande: 'merci', rattache: false, prenom: 'Laia' }).bloquee);
verifier('sans classe : balise [ACTION:MESSAGE] bloquée', filtrerReponseAssistant({ texte: '[ACTION:MESSAGE]', action: null, demande: 'merci', rattache: false, prenom: 'Laia' }).bloquee);
verifier('sans classe : balise complète bloquée', filtrerReponseAssistant({ texte: 'ok [ACTION:ABSENCE|date=2026-11-23|motif=maladie|demi_journee=journee]', action: null, demande: 'oui', rattache: false, prenom: 'Laia' }).bloquee);

// 4. Demande du parent, même sans balise (le modèle demanderait la date) : texte fixe d'emblée.
for (const d of [
  'Peux-tu signaler une absence pour Laia demain ?',
  'Je voudrais déclarer l’absence d’Evan',
  'Prévenez l’école de son absence',
  'Evan sera absent demain matin',
  'Laia sera absente lundi',
  'Écris à la maîtresse que Laia a perdu son gilet',
  'Pouvez-vous envoyer un message à l’enseignant ?',
  'contacter le professeur de Laia',
]) {
  verifier(`demande vers l’école détectée : « ${d} »`, demandeVersEcole(d) && filtrerReponseAssistant({ texte: 'Pour quelle date ?', action: null, demande: d, rattache: false, prenom: 'Laia' }).bloquee);
}

// 5. Questions générales : jamais bloquées.
for (const d of [
  'Comment aider Laia à apprendre ses tables ?',
  'Combien d’absences sont autorisées en CP ?',
  'Que faire si mon enfant est souvent malade ?',
  'Quel est le rôle de la maîtresse en maternelle ?',
]) {
  const r = filtrerReponseAssistant({ texte: 'Voici quelques idées.', action: null, demande: d, rattache: false, prenom: 'Laia' });
  verifier(`question générale non bloquée : « ${d} »`, !r.bloquee && r.texte === 'Voici quelques idées.', r);
}

// 6. Autre action (NOTES) sans classe : conservée.
const r6 = filtrerReponseAssistant({ texte: 'Voir le suivi', action: notes, demande: 'ses notes ?', rattache: false, prenom: 'Laia' });
verifier('sans classe : action NOTES conservée', r6.action === notes && !r6.bloquee, r6);

// 7. Enfant AVEC classe (Lina, démo) : rien ne change, absence et message gardés.
const r7 = filtrerReponseAssistant({ texte: 'C’est noté.', action: absence, demande: 'signaler une absence', rattache: true, prenom: 'Lina' });
verifier('avec classe : action ABSENCE conservée, texte inchangé', r7.action === absence && r7.texte === 'C’est noté.' && !r7.bloquee, r7);
const r8 = filtrerReponseAssistant({ texte: 'x', action: message, demande: 'écris à la maîtresse', rattache: true, prenom: 'Lina' });
verifier('avec classe : action MESSAGE conservée', r8.action === message && !r8.bloquee, r8);

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
