/**
 * Textes juridiques VALIDÉS — ne pas reformuler sans validation (CLAUDE.md, règles RGPD).
 * Source unique : écran RGPD, À propos (principe 3) et information Aria (L10).
 */

import { ASSISTANT } from './marque';

/**
 * Formulation publique validée le 25 sept 2026 (hébergement + assistant). Le TEXTE est inchangé : seul le nom de l'assistant passe par
 * ASSISTANT (marque.json) ; avec le nom actuel, la phrase est identique mot pour mot à la formulation validée (test:nom-en-dur).
 */
export const FORMULATION_HEBERGEMENT_ARIA =
  'Les données du carnet de votre enfant sont hébergées dans l’Union européenne, à Paris. ' +
  `${ASSISTANT.nom} s’appuie sur un modèle d’Anthropic, société américaine. ` +
  `Quand vous utilisez ${ASSISTANT.nomMilieu}, vos messages, l’historique de la conversation, le prénom et le niveau scolaire de ` +
  'l’enfant sont traités hors de l’Union européenne. Anthropic les efface sous 30 jours, sauf s’ils sont ' +
  'signalés pour non-respect de ses règles d’utilisation (conservation jusqu’à 2 ans). ' +
  `Ils ne servent jamais à entraîner le modèle. ${ASSISTANT.nom} ne reçoit rien d’autre du carnet. ` +
  `En cas de message de détresse, rien n’est envoyé ${ASSISTANT.a}.`;
