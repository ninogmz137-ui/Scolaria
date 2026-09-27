/**
 * messagerieStore — Module-level mutable store for Messagerie demo data.
 * No Supabase, no React context needed — plain JS module with subscriber pattern.
 *
 * Usage:
 *   getConversations(childId)        → Conversation[]
 *   getConversation(conversationId)  → Conversation | undefined
 *   markConversationRead(id)         → void
 *   sendMessage(conversationId, text) → void
 *   subscribe(listener)              → unsubscribe fn
 */

import { CONVERSATIONS_BY_CHILD, type Conversation, type Message } from '../data/messagerieData';

// ─── State ───────────────────────────────────────────────

// Deep-clone once so mutations don't affect the source data
let store: Record<string, Conversation[]> = JSON.parse(JSON.stringify(CONVERSATIONS_BY_CHILD));
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

// ─── Public API ──────────────────────────────────────────

export function getConversations(childId: string): Conversation[] {
  return store[childId] ?? [];
}

export function getConversation(conversationId: string): Conversation | undefined {
  for (const convList of Object.values(store)) {
    const found = convList.find((c) => c.id === conversationId);
    if (found) return found;
  }
  return undefined;
}

export function markConversationRead(conversationId: string): void {
  let changed = false;
  for (const childId in store) {
    store[childId] = store[childId].map((c) => {
      if (c.id === conversationId && c.unread) {
        changed = true;
        return { ...c, unread: false };
      }
      return c;
    });
  }
  if (changed) notify();
}

/** « Tout marquer comme lu » (menu « Tout ⌄ » de Messages) : toutes les conversations de l'enfant. */
export function markAllConversationsRead(childId: string): void {
  const liste = store[childId];
  if (!liste?.some((c) => c.unread)) return;
  store[childId] = liste.map((c) => (c.unread ? { ...c, unread: false } : c));
  notify();
}

export function sendMessage(conversationId: string, text: string): void {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = now.toISOString().split('T')[0];

  const newMsg: Message = {
    id: `sent-${Date.now()}`,
    sender: 'parent',
    text,
    time,
    date,
  };

  for (const childId in store) {
    store[childId] = store[childId].map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        messages: [...c.messages, newMsg],
        lastMessage: text,
        lastDate: date,
        lastTime: time,
        unread: false,
      };
    });
  }
  notify();
}

/**
 * « Seulement moi » (B4b) : depuis un fil FAMILLE, envoie le message dans MON fil individuel avec le
 * même enseignant (créé s'il n'existe pas), invisible pour l'autre responsable. Renvoie l'id de ce fil.
 */
export function envoyerSeulementMoi(conversationId: string, text: string): string | undefined {
  const fil = getConversation(conversationId);
  if (!fil || fil.portee !== 'foyer') return undefined;
  const idIndividuel = `${fil.id}~moi`;
  const liste = store[fil.childId] ?? [];
  if (!liste.some((c) => c.id === idIndividuel)) {
    store[fil.childId] = [
      ...liste,
      { ...fil, id: idIndividuel, portee: 'individuel', messages: [], unread: false, lastMessage: '', ariaSummary: undefined },
    ];
  }
  sendMessage(idIndividuel, text);
  return idIndividuel;
}

/** Le fil individuel (« Seulement moi ») déjà ouvert avec l'enseignant d'un fil famille, s'il existe. */
export function filIndividuelDe(conversationId: string): string | undefined {
  const id = `${conversationId}~moi`;
  return getConversation(id) ? id : undefined;
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
