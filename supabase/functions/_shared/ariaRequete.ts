/**
 * Requête reçue par l'Edge Function « aria » : validation et protocole d'urgence.
 * Module partagé SANS réseau ni Deno : testé avec node (`npm run test:aria-requete`).
 *
 * Protocole d'urgence (CLAUDE.md) : il s'applique à TOUS les messages `user` reçus, pas seulement au dernier.
 * Un message de détresse resté dans l'historique (ancienne app, requête forgée) ne doit jamais atteindre le modèle.
 */
import { detectEmergency, type EmergencyCategory } from './emergency.ts';

// Garde-fous d'entrée (le client est authentifié, mais pas de confiance aveugle)
export const MAX_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 8000;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGES &&
    value.every(
      (m) =>
        m !== null &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= MAX_MESSAGE_CHARS,
    ) &&
    value[0].role === 'user' &&
    value[value.length - 1].role === 'user'
  );
}

/**
 * Catégorie d'urgence de l'échange, ou null : celle du message `user` le plus RÉCENT qui déclenche
 * (le numéro d'aide mis en premier est celui de la dernière détresse exprimée).
 */
export function urgenceDansMessages(messages: ChatMessage[]): EmergencyCategory | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    const categorie = detectEmergency(messages[i].content);
    if (categorie) return categorie;
  }
  return null;
}
