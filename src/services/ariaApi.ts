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

import { getChildContext, buildChildContextString } from './childContext';
import { supabase } from './supabase';
import { detectEmergency, EMERGENCY_MESSAGE } from '../../supabase/functions/_shared/emergency';
import { CONVERSATIONS_BY_CHILD } from '../data/messagerieData';

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

function buildSystemPrompt(childId: string, childName?: string): string {
  const child = getChildContext(childId, childName);
  const contextStr = buildChildContextString(child);

  const conversations = CONVERSATIONS_BY_CHILD[childId] ?? [];
  const convList = conversations.map(c => `  - ${c.id} : ${c.name} (${c.role})`).join('\n');
  const conversationsSection = convList
    ? `\n═══ CONVERSATIONS DISPONIBLES POUR LES MESSAGES ═══\n${convList}\n`
    : '';

  return `Tu es Aria, l'assistante IA de Scolaria — le carnet de scolarité numérique des familles françaises.

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
  childId: string = 'demo-lea',
  options?: { isDemo?: boolean; childName?: string },
): Promise<string> {
  // Protocole d'urgence (CLAUDE.md) : jamais de réponse d'IA ni d'exemple sur un message de détresse.
  // L'Edge Function refait ce contrôle et fait foi ; ici il couvre aussi le mode démo.
  if (detectEmergency(userMessage)) {
    return EMERGENCY_MESSAGE;
  }

  // Mode démo : réponses d'exemple locales, pas d'appel serveur
  if (options?.isDemo) {
    return getFallbackResponse(userMessage, childId, options?.childName);
  }

  const systemPrompt = buildSystemPrompt(childId, options?.childName);

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

function buildFallbackResponses(childId: string, childName?: string): string[] {
  const child = getChildContext(childId, childName);
  const { profile, grades, activities, recentJoy, upcomingEvents } = child;
  const name = profile.name.split(' ')[0]; // First name only

  const intro = `Bonjour ! Je suis Aria, ton assistante scolaire. En mode démo, je te propose des exemples adaptés à ${name} pour découvrir Scolaria.`;

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

function getFallbackResponse(
  userMessage: string,
  childId: string,
  childName?: string,
): string {
  const responses = buildFallbackResponses(childId, childName);
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
