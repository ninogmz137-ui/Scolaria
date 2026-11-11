/**
 * Alerte du protocole d'urgence (M11) — chemin UNIQUE, partagé par l'assistant (ariaApi) et l'écran Bien-être (createCheckin).
 */
import { supabase } from './supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre l'alerte : catégorie + enfant + date, JAMAIS le texte du message.
 * Privée à son auteur (RLS) : jamais visible de l'autre responsable ni de l'enseignant.
 * Sans effet en mode démo ; un échec n'empêche jamais d'afficher les numéros d'aide.
 */
export function recordEmergencyAlert(category: string, childId: string): void {
  const child_id = UUID_RE.test(childId) ? childId : null;
  void Promise.resolve(
    supabase.from('alertes_urgence').insert({ categorie: category, child_id }),
  ).catch(() => undefined);
}
