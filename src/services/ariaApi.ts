/**
 * Aria API Service — connects to Claude API (Anthropic)
 *
 * Sends messages to claude-sonnet-4-20250514 with the child's
 * full context as system prompt. Falls back to a mock
 * response if the API key is not configured.
 */

import { getChildContext, buildChildContextString } from './childContext';
import { ENV } from './getEnv';
import { CONVERSATIONS_BY_CHILD } from '../data/messagerieData';

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

// ─── Startup diagnostics ────────────────────────────────
console.log(`[Aria] API key status: ${ENV.ANTHROPIC_API_KEY ? `present (${ENV.ANTHROPIC_API_KEY.substring(0, 12)}...)` : 'MISSING'}`);

// ─── System prompt builder ───────────────────────────────

function buildSystemPrompt(childId: string): string {
  const child = getChildContext(childId);
  const contextStr = buildChildContextString(child);

  const conversations = CONVERSATIONS_BY_CHILD[childId] ?? [];
  const convList = conversations.map(c => `  - ${c.id} : ${c.name} (${c.role})`).join('\n');
  const conversationsSection = convList
    ? `\n═══ CONVERSATIONS DISPONIBLES POUR LES MESSAGES ═══\n${convList}\n`
    : '';

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

═══ ACTIONS DISPONIBLES ═══
Quand un parent te demande de faire une action concrète, tu peux l'exécuter pour lui.
RÈGLE IMPORTANTE : n'émets un tag d'action QUE si tu as toutes les informations nécessaires.
Si des informations manquent (motif, destinataire...), pose d'abord une question avant d'émettre le tag.

FORMAT : termine ta réponse par UN SEUL tag d'action structuré, sur une nouvelle ligne.

▸ SIGNALER UNE ABSENCE :
[ACTION:ABSENCE|date=YYYY-MM-DD|motif=MOTIF|demi_journee=PERIODE|student_id=STUDENT_ID]
  - date : date de l'absence au format YYYY-MM-DD (aujourd'hui si non précisé)
  - motif : maladie | maladie_avec_certificat | raison_familiale | autre
  - demi_journee : journee | matin | apres_midi
  - student_id : identifiant de l'enfant (voir données ci-dessous)

▸ ENVOYER UN MESSAGE :
[ACTION:MESSAGE|conversation_id=CONV_ID|draft=TEXTE_DU_MESSAGE]
  - conversation_id : identifiant de la conversation (voir liste ci-dessous)
  - draft : texte complet du message que tu rédiges pour le parent, en son nom, en français poli

N'utilise qu'UN seul tag par réponse. Ne génère pas de tag si l'intention n'est pas claire.
Exemple absence : [ACTION:ABSENCE|date=2026-04-16|motif=maladie|demi_journee=journee|student_id=1]
Exemple message : [ACTION:MESSAGE|conversation_id=lea-laurent|draft=Bonjour Madame Laurent, je vous contacte pour vous informer que Léa sera absente demain en raison d'une indisposition. Cordialement]

${conversationsSection}═══ DONNÉES DE L'ENFANT SUIVI ═══

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
  options?: { isDemo?: boolean },
): Promise<string> {
  const apiKey = ENV.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.warn('[Aria] No API key configured — using fallback response');
    return getFallbackResponse(userMessage, childId, options?.isDemo === true);
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
        return '⚠️ Clé API expirée ou invalide. Régénère ta clé sur console.anthropic.com et mets-la à jour dans eas.json + .env';
      }
      if (response.status === 429) {
        return '⏳ Trop de requêtes envoyées. Attends quelques secondes et réessaie.';
      }

      return getFallbackResponse(userMessage, childId, options?.isDemo === true);
    }

    const data: ClaudeResponse = await response.json();

    const textContent = data.content.find((c) => c.type === 'text');
    if (textContent) {
      return textContent.text;
    }

    return getFallbackResponse(userMessage, childId, options?.isDemo === true);
  } catch (error) {
    console.error('[Aria] Network error:', error);
    return '📡 Impossible de contacter Aria pour le moment. Vérifie ta connexion internet et réessaie.';
  }
}

// ─── Fallback responses (when no API key) ───────────────

function buildFallbackResponses(childId: string, isDemoApp: boolean): string[] {
  const child = getChildContext(childId);
  const { profile, grades, activities, recentJoy, upcomingEvents } = child;
  const name = profile.name.split(' ')[0]; // First name only

  const intro = isDemoApp
    ? `Bonjour ! Je suis Aria ✦, ton assistante scolaire. En mode démo, je te propose des exemples adaptés à ${name} pour découvrir Scolaria.`
    : `Je suis Aria, ton assistante scolaire ! Pour me connecter à l'IA, configure ta clé API Anthropic dans le fichier .env (EXPO_PUBLIC_ANTHROPIC_API_KEY). En attendant, je fonctionne en mode démo pour ${name}. 🔑`;

  if (grades.length === 0) {
    // Maternelle — no grades
    const activitiesStr = activities.map((a) => a.name.toLowerCase()).join(', ');
    const joyAvg = recentJoy.length > 0
      ? (recentJoy.reduce((s, j) => s + j.score, 0) / recentJoy.length).toFixed(1)
      : '—';
    return [
      intro,
      `${name} a une journée bien remplie ! Ses activités (${activitiesStr}) contribuent à son épanouissement. Son Score de Joie moyen est de ${joyAvg}/10 — c'est excellent ! 🌈`,
      `Le Score de Joie de ${name} est très positif cette semaine (moyenne ${joyAvg}/10). ${name} est épanoui(e) et plein(e) d'énergie ! 😊`,
      upcomingEvents.length > 0
        ? `Prochain événement pour ${name} : ${upcomingEvents[0]}. Une belle journée en perspective ! 🎨`
        : `Pas d'événement particulier prévu pour ${name} cette semaine. Un moment de calme bien mérité ! 🌿`,
      `Les activités de ${name} (${activitiesStr}) sont variées et stimulantes. Un bel équilibre pour son développement ! 🎯`,
    ];
  }

  const overallAvg = (grades.reduce((s, g) => s + g.average, 0) / grades.length).toFixed(1);
  const best = grades.reduce((b, g) => (g.average > b.average ? g : b));
  const weakest = grades.reduce((w, g) => (g.average < w.average ? g : w));
  const activitiesStr = activities.map((a) => a.name.toLowerCase()).join(', ');
  const joyAvg = recentJoy.length > 0
    ? (recentJoy.reduce((s, j) => s + j.score, 0) / recentJoy.length).toFixed(1)
    : '—';

  return [
    intro,
    `D'après les données de ${name}, sa moyenne générale est de ${overallAvg}/20 — c'est très bien ! Sa matière la plus forte est ${best.subject.toLowerCase()} (${best.average}/20) et il/elle pourrait progresser en ${weakest.subject.toLowerCase()} (${weakest.average}/20). Un plan de révision ciblé serait bénéfique. 📊`,
    `Le Score de Joie de ${name} est stable cette semaine (moyenne ${joyAvg}/10). Son niveau de stress reste bas, ce qui est positif ! 😊`,
    upcomingEvents.length > 0
      ? `${name} a un événement à venir : ${upcomingEvents[0]}. Je recommande de bien se préparer à l'avance avec des sessions courtes et régulières. 📐`
      : `Pas de contrôle imminent pour ${name}. C'est le bon moment pour consolider les acquis et renforcer ${weakest.subject.toLowerCase()}. 📐`,
    `Les activités extra-scolaires de ${name} (${activitiesStr}) sont bien équilibrées. Elles contribuent positivement à son épanouissement scolaire ! 🎯`,
  ];
}

let fallbackIndex = 0;

function getFallbackResponse(userMessage: string, childId: string, isDemoApp = false): string {
  const responses = buildFallbackResponses(childId, isDemoApp);
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
