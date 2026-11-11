/**
 * Aria API Service — passe par l'Edge Function Supabase « aria ».
 *
 * L'app ne connaît AUCUNE clé API : elle appelle supabase.functions.invoke('aria'),
 * qui transmet automatiquement la session de l'utilisateur. La clé Anthropic est un
 * secret Supabase, utilisé uniquement côté serveur (supabase/functions/aria).
 *
 * Mode démo (sans session) : réponses d'exemple locales, aucun appel réseau.
 * Toute erreur → « Aria est momentanément indisponible. » (jamais de détail technique).
 */

import { getChildContext } from './childContext';
import { FunctionRegion } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { buildEmergencyMessage, detectEmergency } from '../../supabase/functions/_shared/emergency';
import { de } from '../utils/francais';
import { ariaAutorisee } from './ariaPreferences';
import { recordEmergencyAlert } from './alerteUrgence';
import { NOM_APP, ASSISTANT } from '../constants/marque';

// ─── Types ────────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AriaFunctionResponse {
  text?: string;
  /** Catégorie du protocole d'urgence déclenché côté serveur (le texte est alors le message fixe). */
  alert?: string;
  error?: string;
  /** Plafond quotidien, renvoyé avec error === 'limite'. */
  limite?: number;
}

/** Réponse de sendToAria : le texte à afficher, et la catégorie d'urgence si le protocole s'est déclenché. */
export interface ReponseAria {
  text: string;
  /** Non null : `text` est le message fixe (numéros d'aide) ; le texte saisi ne doit être gardé NULLE PART. */
  urgence: string | null;
}

// ─── Constants ────────────────────────────────────────────

/** Seul message d'erreur montré à l'utilisateur. */
export const ARIA_UNAVAILABLE = `${ASSISTANT.nom} est momentanément indisponible.`;
/** Plafond quotidien d'appels à l'assistant atteint (par compte, jour de Paris) : ce que dit l'app, sans détail technique. */
export function messageLimiteAria(limite?: number): string {
  const n = typeof limite === 'number' && limite > 0 ? `${limite} questions` : 'questions';
  return `Vous avez atteint la limite de ${n} ${ASSISTANT.a} pour aujourd’hui. ${ASSISTANT.nom} sera de nouveau disponible demain, à partir de minuit (heure de Paris). Le reste de l’application n’est pas concerné.`;
}
/** Assistant désactivé dans Famille & paramètres (ou information pas encore lue) : rien n'a été envoyé. */
export const ARIA_DESACTIVEE = `${ASSISTANT.nom} est désactivé${ASSISTANT.e}. Aucun message n’a été envoyé.`;

// Les consignes du modèle (prompt système) ne sont PAS construites ici : l'Edge Function « aria » les écrit elle-même
// (supabase/functions/_shared/ariaPrompt.ts) à partir du prénom et du niveau de l'enfant, lus sous RLS.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── API call ────────────────────────────────────────────

export async function sendToAria(
  userMessage: string,
  conversationHistory: ClaudeMessage[],
  childId: string,
  options?: { isDemo?: boolean },
): Promise<ReponseAria> {
  const reponse = (text: string): ReponseAria => ({ text, urgence: null });

  // Protocole d'urgence (CLAUDE.md) : jamais de réponse d'IA ni d'exemple sur un message de détresse.
  // L'Edge Function refait ce contrôle et fait foi ; ici il couvre aussi le mode démo.
  // L'appelant reçoit `urgence` : il ne garde le texte saisi nulle part (ariaEchange.conclureEchange).
  const emergency = detectEmergency(userMessage);
  if (emergency) {
    if (!options?.isDemo) recordEmergencyAlert(emergency, childId);
    return { text: buildEmergencyMessage(emergency, ASSISTANT), urgence: emergency };
  }

  // Aria désactivée, ou information pas encore lue (L10, D8) : AUCUN appel au modèle.
  if (!(await ariaAutorisee())) {
    return reponse(ARIA_DESACTIVEE);
  }

  // Mode démo : réponses d'exemple locales, pas d'appel serveur
  if (options?.isDemo) {
    return reponse(getFallbackResponse(userMessage, childId));
  }

  // Compte réel : l'app n'envoie que l'identifiant de l'enfant actif (ou null) et les messages.
  // Le serveur lit lui-même le prénom et le niveau sous RLS et construit les consignes ; jamais de données de démo.
  const child_id = UUID_RE.test(childId) ? childId : null;

  // Build messages array: conversation history + new message
  const messages: ClaudeMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    // invoke() joint automatiquement le JWT de la session Supabase en cours
    // Région imposée : Paris, comme la base. Sans elle, la fonction s'exécute dans la région la plus
    // proche de l'utilisateur, pas forcément dans l'UE (doc Supabase « Regional Invocations »).
    const { data, error } = await supabase.functions.invoke<AriaFunctionResponse>('aria', {
      body: { child_id, messages },
      region: FunctionRegion.EuWest3,
    });

    // Limite quotidienne par compte atteinte (M31) : message clair, pas « indisponible ».
    if (data?.error === 'limite') return reponse(messageLimiteAria(data.limite));

    if (error || !data?.text) {
      console.warn('[Aria] Edge Function indisponible', error?.name ?? data?.error ?? 'réponse vide');
      return reponse(ARIA_UNAVAILABLE);
    }
    // Urgence vue par le serveur (un message de l'historique déclenche) : même traitement que la détection locale.
    return { text: data.text, urgence: data.alert ?? null };
  } catch (error) {
    console.warn('[Aria] Appel impossible', error);
    return reponse(ARIA_UNAVAILABLE);
  }
}

// ─── Réponses d'exemple (mode démo uniquement) ──────────

function buildFallbackResponses(childId: string): string[] {
  const child = getChildContext(childId);
  if (!child) {
    return [
      `Bonjour ! Je suis ${ASSISTANT.nomMilieu}. Ajoutez le carnet d’un enfant pour découvrir des réponses adaptées à son niveau.`,
    ];
  }
  const { profile, grades, activities, upcomingEvents } = child;
  const name = profile.name.split(' ')[0]; // First name only

  const intro = `Bonjour ! Je suis ${ASSISTANT.nomMilieu}. En mode démo, je vous propose des exemples adaptés à ${name} pour découvrir ${NOM_APP}.`;

  if (grades.length === 0) {
    // Maternelle — no grades
    const activitiesStr = activities.map((a) => a.name.toLowerCase()).join(', ');
    return [
      intro,
      `${name} a une semaine bien remplie : ses activités (${activitiesStr}) contribuent à son épanouissement.`,
      `Le Score de Joie est une tendance, pas une note : pour ${name}, elle paraît stable ces derniers jours. Vous pouvez en parler ensemble si vous le souhaitez.`,
      upcomingEvents.length > 0
        ? `Prochain événement pour ${name} : ${upcomingEvents[0]}.`
        : `Pas d'événement particulier prévu pour ${name} cette semaine.`,
      `Les activités ${de(name)} (${activitiesStr}) sont variées : un bel équilibre.`,
    ];
  }

  const overallAvg = (grades.reduce((s, g) => s + g.average, 0) / grades.length).toFixed(1);
  const best = grades.reduce((b, g) => (g.average > b.average ? g : b));
  const weakest = grades.reduce((w, g) => (g.average < w.average ? g : w));
  const activitiesStr = activities.map((a) => a.name.toLowerCase()).join(', ');
  return [
    intro,
    `D'après le carnet ${de(name)}, la moyenne générale est de ${overallAvg}/20. Point fort : ${best.subject.toLowerCase()} (${best.average}/20) ; à consolider : ${weakest.subject.toLowerCase()} (${weakest.average}/20). Voulez-vous un plan de révision ?`,
    `Le Score de Joie est une tendance, pas une note : pour ${name}, elle paraît stable ces derniers jours. Vous pouvez en parler ensemble si vous le souhaitez.`,
    upcomingEvents.length > 0
      ? `${name} a un événement à venir : ${upcomingEvents[0]}. Je vous conseille des révisions courtes et régulières d'ici là.`
      : `Pas de contrôle imminent pour ${name} : c'est un bon moment pour consolider les acquis en ${weakest.subject.toLowerCase()}.`,
    `Les activités extra-scolaires ${de(name)} (${activitiesStr}) sont bien équilibrées.`,
  ];
}

let fallbackIndex = 0;

function getFallbackResponse(userMessage: string, childId: string): string {
  const responses = buildFallbackResponses(childId);
  if (responses.length === 1) return responses[0];
  const msg = userMessage.toLowerCase();

  if (msg.includes('note') || msg.includes('résultat') || msg.includes('moyenne')) {
    return responses[1];
  }
  if (msg.includes('bien-être') || msg.includes('joie') || msg.includes('ressenti') || msg.includes('stress')) {
    return responses[2];
  }
  if (msg.includes('contrôle') || msg.includes('examen') || msg.includes('révision') || msg.includes('préparer')) {
    return responses[3];
  }
  if (msg.includes('activité') || msg.includes('sport') || msg.includes('extra')) {
    return responses[4];
  }

  const response = responses[fallbackIndex % responses.length];
  fallbackIndex++;
  return response;
}

// ─── Export types ────────────────────────────────────────

export type { ClaudeMessage };
