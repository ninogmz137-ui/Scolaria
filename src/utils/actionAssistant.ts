/**
 * Actions de l'assistant pour un enfant dont l'école n'est PAS sur l'app (règle du 21 nov. 2026, CLAUDE.md § Agenda ›
 * Absence) : « Signaler une absence » et « Écrire à l'enseignant » ne sont jamais proposés. Si le parent le demande
 * quand même, la réponse est un texte fixe et RIEN n'est enregistré (aucune carte de confirmation).
 *
 * Le contrôle se fait dans l'app, avec la même source que les écrans (`useEnseignantRattache`), et pas dans les
 * consignes du serveur : le modèle ne reçoit que le prénom et le niveau (formulation publique validée le 25 sept.),
 * jamais « l'école est sur l'app ».
 *
 * Module pur, testé par node (`npm run test:action-assistant`) : aucun import.
 */

/** Balises d'action qui atteindraient l'école : avec paramètres (`[ACTION:ABSENCE|…]`) ou nues (`[ACTION:MESSAGE]`). */
const BALISE_ECOLE = /\[ACTION:(ABSENCE|MESSAGE)\b[^\]]*\]/i;
const TYPES_ECOLE = new Set(['ABSENCE', 'MESSAGE']);

/** Demande explicite du parent : signaler / déclarer / prévenir une absence, ou écrire / prévenir l'enseignant. */
// `\b` de JavaScript ignore les lettres accentuées (« Écris ») : limites de mot écrites avec une classe de lettres
// explicite (ni \p{L} ni regard en arrière, pour rester sûr sous Hermes).
const L = 'a-zàâäéèêëîïôöùûüçœæ';
const DEBUT = `(?:^|[^${L}])`;
const FIN = `(?![${L}])`;
const MOT = `[${L}]*`;
const DEMANDE_ABSENCE = new RegExp(
  `${DEBUT}(?:signal|d[ée]clar|pr[ée]ven|pr[ée]vien|excus|justifi)${MOT}[^.?!\\n]{0,60}${DEBUT}absen${MOT}` +
    `|${DEBUT}(?:sera|serait|seront)\\s+absente?s?${FIN}`,
  'i',
);
const DEMANDE_ENSEIGNANT = new RegExp(
  `${DEBUT}(?:[ée]cri|envoy|contact|pr[ée]ven|pr[ée]vien)${MOT}[^.?!\\n]{0,40}${DEBUT}` +
    `(?:enseignant${MOT}|ma[iî]tre(?:sse)?s?|instit${MOT}|professeur${MOT}|profs?)${FIN}`,
  'i',
);

export function demandeVersEcole(texte: string): boolean {
  return DEMANDE_ABSENCE.test(texte) || DEMANDE_ENSEIGNANT.test(texte);
}

const ELISION = /^[aeiouyhàâäéèêëîïôöùûüœæ]/i;

/** Texte fixe (vouvoiement) : l'école n'est pas encore sur l'app, rien n'a été envoyé. */
export function messageEcoleAbsente(prenom: string): string {
  const p = (prenom ?? '').trim().split(/\s+/)[0] ?? '';
  const qui = !p ? 'de votre enfant' : ELISION.test(p) ? `d’${p}` : `de ${p}`;
  return (
    `L’école ${qui} n’est pas encore sur l’app : je ne peux ni signaler une absence ni écrire à son enseignant. ` +
    'Rien n’a été envoyé. Prévenez l’école directement, comme d’habitude.'
  );
}

export interface ReponseFiltree<A> {
  texte: string;
  action: A | null;
  /** Vrai si la réponse a été remplacée par le texte fixe. */
  bloquee: boolean;
}

/**
 * Réponse de l'assistant après contrôle. `rattache` = l'enfant a une classe sur l'app (`useEnseignantRattache`).
 * Rattaché : rien ne change. Sinon, si le parent a demandé une absence ou un message à l'enseignant, ou si la réponse
 * contient une telle action : texte fixe, aucune action.
 */
export function filtrerReponseAssistant<A extends { type: string }>(e: {
  texte: string;
  action: A | null;
  demande: string;
  rattache: boolean;
  prenom: string;
}): ReponseFiltree<A> {
  if (e.rattache) return { texte: e.texte, action: e.action, bloquee: false };
  const actionEcole = !!e.action && TYPES_ECOLE.has(String(e.action.type).toUpperCase());
  if (actionEcole || BALISE_ECOLE.test(e.texte) || demandeVersEcole(e.demande)) {
    return { texte: messageEcoleAbsente(e.prenom), action: null, bloquee: true };
  }
  return { texte: e.texte, action: e.action, bloquee: false };
}
