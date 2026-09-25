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
import { supabase } from './supabase';
import { buildEmergencyMessage, detectEmergency } from '../../supabase/functions/_shared/emergency';
import { de } from '../utils/francais';

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
}

// ─── Constants ────────────────────────────────────────────

/** Seul message d'erreur montré à l'utilisateur. */
export const ARIA_UNAVAILABLE = 'Aria est momentanément indisponible.';

// ─── System prompt builder ───────────────────────────────

/**
 * Enfant réel : Aria ne reçoit que le PRÉNOM et le NIVEAU (minimisation, CLAUDE.md). Aucune donnée
 * de démo : les données du carnet seront construites côté serveur, sous RLS, quand elles existeront.
 */
function buildRealChildSystemPrompt(prenom: string, niveau?: string | null): string {
  const niveauStr = niveau ? ` (${niveau})` : '';
  return `Tu es Aria, l'assistante IA de Scolaria, le carnet de scolarité numérique.

═══ TON RÔLE ═══
- Tu accompagnes un parent dans le suivi scolaire de ${prenom}${niveauStr}, et de cet enfant seulement.
- Tu es bienveillante, encourageante et constructive, jamais alarmiste.
- Tu parles en français, de manière claire et chaleureuse, et tu VOUVOIES toujours le parent.

═══ TES RÈGLES ═══
- Ne donne JAMAIS de diagnostic médical ou psychologique ; oriente vers un professionnel si besoin.
- Tu n'as encore AUCUNE donnée du carnet de ${prenom} (notes, compétences, événements, messages) :
  n'en invente jamais. Réponds de façon générale et adaptée au niveau, et propose de consulter le carnet.
- Ne parle jamais d'un autre enfant.
- Sois concise : 2 à 4 paragraphes maximum sauf si on te demande plus de détail.

═══ ACTION DISPONIBLE ═══
Si le parent demande de signaler une absence et que tu as toutes les informations, termine ta réponse
par ce tag, seul, sur une nouvelle ligne :
[ACTION:ABSENCE|date=YYYY-MM-DD|motif=MOTIF|demi_journee=PERIODE]
  - motif : maladie | maladie_avec_certificat | raison_familiale | autre
  - demi_journee : journee | matin | apres_midi
Si une information manque, pose d'abord la question. Pas de tag si l'intention n'est pas claire.

═══ DATE DU JOUR ═══
${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;
}

/** Compte sans enfant enregistré : Aria répond de façon générale, sans données d'enfant. */
function buildNoChildSystemPrompt(): string {
  return `Tu es Aria, l'assistante IA de Scolaria, le carnet de scolarité numérique.

Aucun enfant n'est encore ajouté au carnet de ce parent.
- Réponds de façon générale et bienveillante aux questions sur la scolarité (maternelle au lycée), en vouvoyant toujours le parent.
- N'invente jamais de notes, d'enseignants ni d'événements : tu n'as aucune donnée d'enfant.
- Quand c'est utile, propose d'ajouter un enfant au carnet pour des réponses personnalisées.
- Ne donne JAMAIS de diagnostic médical ou psychologique ; oriente vers un professionnel si besoin.
- Réponds en français, en 2 à 4 paragraphes maximum.

═══ DATE DU JOUR ═══
${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;
}

// ─── Alerte du protocole d'urgence (M11) ────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre l'alerte : catégorie + enfant + date, JAMAIS le texte du message.
 * Privée à son auteur (RLS) : jamais visible de l'autre responsable ni de l'enseignant.
 * Sans effet en mode démo ; un échec n'empêche jamais d'afficher les numéros d'aide.
 */
function recordEmergencyAlert(category: string, childId: string): void {
  const child_id = UUID_RE.test(childId) ? childId : null;
  void Promise.resolve(
    supabase.from('alertes_urgence').insert({ categorie: category, child_id }),
  ).catch(() => undefined);
}

// ─── API call ────────────────────────────────────────────

export async function sendToAria(
  userMessage: string,
  conversationHistory: ClaudeMessage[],
  childId: string,
  options?: { isDemo?: boolean; childName?: string; niveau?: string | null },
): Promise<string> {
  // Protocole d'urgence (CLAUDE.md) : jamais de réponse d'IA ni d'exemple sur un message de détresse.
  // L'Edge Function refait ce contrôle et fait foi ; ici il couvre aussi le mode démo.
  const emergency = detectEmergency(userMessage);
  if (emergency) {
    if (!options?.isDemo) recordEmergencyAlert(emergency, childId);
    return buildEmergencyMessage(emergency);
  }

  // Mode démo : réponses d'exemple locales, pas d'appel serveur
  if (options?.isDemo) {
    return getFallbackResponse(userMessage, childId);
  }

  // Compte réel : contexte = l'enfant actif (prénom + niveau) s'il existe, sinon aucun enfant.
  // Jamais de données de démo, jamais un autre enfant.
  const prenom = options?.childName?.trim().split(/\s+/)[0];
  const systemPrompt =
    UUID_RE.test(childId) && prenom
      ? buildRealChildSystemPrompt(prenom, options?.niveau)
      : buildNoChildSystemPrompt();

  // Build messages array: conversation history + new message
  const messages: ClaudeMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    // invoke() joint automatiquement le JWT de la session Supabase en cours
    const { data, error } = await supabase.functions.invoke<AriaFunctionResponse>('aria', {
      body: { system: systemPrompt, messages },
    });

    if (error || !data?.text) {
      console.warn('[Aria] Edge Function indisponible', error?.name ?? data?.error ?? 'réponse vide');
      return ARIA_UNAVAILABLE;
    }
    return data.text;
  } catch (error) {
    console.warn('[Aria] Appel impossible', error);
    return ARIA_UNAVAILABLE;
  }
}

// ─── Réponses d'exemple (mode démo uniquement) ──────────

function buildFallbackResponses(childId: string): string[] {
  const child = getChildContext(childId);
  if (!child) {
    return [
      'Bonjour ! Je suis Aria. Ajoutez le carnet d’un enfant pour découvrir des réponses adaptées à son niveau.',
    ];
  }
  const { profile, grades, activities, upcomingEvents } = child;
  const name = profile.name.split(' ')[0]; // First name only

  const intro = `Bonjour ! Je suis Aria. En mode démo, je vous propose des exemples adaptés à ${name} pour découvrir Scolaria.`;

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
