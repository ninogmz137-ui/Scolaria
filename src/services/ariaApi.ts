/**
 * Aria API Service — connects to Claude API (Anthropic)
 *
 * Sends messages to claude-sonnet-4-20250514 with the child's
 * full context as system prompt. Falls back to a mock
 * response if the API key is not configured.
 */

import { getChildContext, buildChildContextString } from './childContext';

// ─── Types ────────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: { type: string; text: string }[];
}

// ─── Constants ────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 1024;

// ─── System prompt builder ───────────────────────────────

function buildSystemPrompt(childId: string): string {
  const child = getChildContext(childId);
  const contextStr = buildChildContextString(child);

  return `Tu es Aria ✦, l'assistante IA de Scolaria — le passeport scolaire numérique pour les familles françaises.

═══ TON RÔLE ═══
- Tu accompagnes les parents dans le suivi scolaire de leurs enfants
- Tu analyses les résultats, détectes les tendances, et proposes des conseils personnalisés
- Tu es bienveillante, encourageante et constructive — jamais alarmiste
- Tu parles en français, de manière claire et chaleureuse
- Tu utilises occasionnellement des emojis pour rester accessible

═══ TES CAPACITÉS ═══
- Analyser les notes et identifier les forces/faiblesses
- Proposer des plans de révision adaptés
- Donner des conseils de bien-être scolaire
- Aider à préparer les contrôles et examens
- Suggérer des activités complémentaires
- Interpréter les scores de bien-être (Score de Joie)

═══ TES RÈGLES ═══
- Ne donne JAMAIS de diagnostic médical ou psychologique
- Oriente vers des professionnels si tu détectes un mal-être profond
- Respecte la confidentialité : ne partage pas les données d'un enfant avec un autre contexte
- Base tes réponses sur les données réelles du profil ci-dessous
- Sois concise : réponds en 2-4 paragraphes maximum sauf si on te demande plus de détail
- Quand tu cites des notes, utilise les vraies données du profil

═══ DONNÉES DE L'ENFANT SUIVI ═══

${contextStr}

═══ DATE DU JOUR ═══
${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;
}

// ─── API call ────────────────────────────────────────────

export async function sendToAria(
  userMessage: string,
  conversationHistory: ClaudeMessage[],
  childId: string = '1',
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.warn('[Aria] No API key configured — using fallback response');
    return getFallbackResponse(userMessage);
  }

  const systemPrompt = buildSystemPrompt(childId);

  // Build messages array: conversation history + new message
  const messages: ClaudeMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Aria] API error:', response.status, errorBody);

      if (response.status === 401) {
        return '⚠️ Clé API invalide. Vérifie ta variable d\'environnement EXPO_PUBLIC_ANTHROPIC_API_KEY dans le fichier .env';
      }
      if (response.status === 429) {
        return '⏳ Trop de requêtes envoyées. Attends quelques secondes et réessaie.';
      }

      return getFallbackResponse(userMessage);
    }

    const data: ClaudeResponse = await response.json();

    const textContent = data.content.find((c) => c.type === 'text');
    if (textContent) {
      return textContent.text;
    }

    return getFallbackResponse(userMessage);
  } catch (error) {
    console.error('[Aria] Network error:', error);
    return '📡 Impossible de contacter Aria pour le moment. Vérifie ta connexion internet et réessaie.';
  }
}

// ─── Fallback responses (when no API key) ───────────────

const FALLBACK_RESPONSES = [
  'Je suis Aria, ton assistante scolaire ! Pour me connecter à l\'IA, configure ta clé API Anthropic dans le fichier .env (EXPO_PUBLIC_ANTHROPIC_API_KEY). En attendant, je fonctionne en mode démo. 🔑',
  'D\'après les données de Lucas, sa moyenne générale est de 15.1/20 — c\'est très bien ! Sa matière la plus forte est l\'anglais (17/20) et il pourrait progresser en sciences (13/20). Un plan de révision ciblé serait bénéfique. 📊',
  'Le Score de Joie de Lucas est stable cette semaine (moyenne 7.6/10). Son niveau de stress reste bas, ce qui est positif. Le mercredi semble être sa meilleure journée ! 😊',
  'Lucas a un contrôle de maths vendredi sur les fractions et la proportionnalité. Je recommande 30 minutes de révision par jour : exercices de fractions lundi, proportionnalité mardi, et un contrôle blanc mercredi. 📐',
  'Les activités extra-scolaires de Lucas (judo, piano, robotique) sont bien équilibrées entre sport, art et tech. Le judo aide à la concentration et le piano à la mémoire — deux atouts pour les études ! 🎯',
];

let fallbackIndex = 0;

function getFallbackResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('note') || msg.includes('résultat') || msg.includes('moyenne')) {
    return FALLBACK_RESPONSES[1];
  }
  if (msg.includes('bien-être') || msg.includes('joie') || msg.includes('ressenti') || msg.includes('stress')) {
    return FALLBACK_RESPONSES[2];
  }
  if (msg.includes('contrôle') || msg.includes('examen') || msg.includes('révision') || msg.includes('préparer')) {
    return FALLBACK_RESPONSES[3];
  }
  if (msg.includes('activité') || msg.includes('sport') || msg.includes('extra')) {
    return FALLBACK_RESPONSES[4];
  }

  const response = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
  fallbackIndex++;
  return response;
}

// ─── Export types ────────────────────────────────────────

export type { ClaudeMessage };
