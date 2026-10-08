/**
 * Edge Function « aria » — seul point de contact entre Scolaria et l'API Anthropic.
 *
 * - La clé API vit UNIQUEMENT dans les secrets Supabase (ANTHROPIC_API_KEY). Jamais dans l'app.
 * - Appelable seulement avec une session Supabase valide (JWT vérifié par la plateforme + getUser ici).
 * - Modèle et max_tokens sont fixés ici, pas par le client. Modèle : 'claude-sonnet-5' par défaut ;
 *   le secret facultatif ARIA_MODEL le remplace sans redéployer. Pas de repli : un refus = « indisponible ».
 * - Journaux : un texte fixe + des champs choisis (statut, type, modèle…). JAMAIS la clé, les en-têtes,
 *   le corps de la requête ni l'objet d'erreur brut ; journaux internes du SDK coupés (logLevel 'off').
 *   Garanti par `npm run test:journaux` (supabase/functions/_shared/journaux.test.mts).
 * - Limite quotidienne par compte (M31, aria_usage_quotidien) : réservée avant l'appel, rendue si le modèle
 *   n'a pas répondu ; au-delà : { error: 'limite', limite } (l'app affiche un message clair). Journal : nombres seulement.
 * - Protocole d'urgence AVANT tout appel au modèle : mot-clé critique → message fixe
 *   (3114 / 3018 / 119 + 112), aucun appel Anthropic, alerte signalée (catégorie seule).
 * - Réponse au client : { text } | { text, alert } | { error: 'unavailable' } — jamais de détail technique.
 *
 * TEMPORAIRE (phase A) : le prompt système est encore construit côté app, à partir des données
 * de démo locales. Quand les données du carnet seront en base, cette fonction construira elle-même
 * le contexte à partir de student_id (lu sous RLS avec le JWT de l'appelant) et n'acceptera plus
 * de `system` venant du client.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildEmergencyMessage, detectEmergency } from '../_shared/emergency.ts';

/** Règle de ton imposée par le serveur (fait foi) : Aria vouvoie toujours le parent. */
const REGLE_VOUVOIEMENT =
  "Règle absolue : tu vouvoies TOUJOURS le parent (vous, votre, vos), jamais de tutoiement.";

const MODEL = Deno.env.get('ARIA_MODEL') ?? 'claude-sonnet-5';
const MAX_TOKENS = 16000;

/** Plafond d'appels au modèle par compte et par jour (jour de Paris). Secret facultatif ARIA_LIMITE_JOUR (1 à 1000). */
const LIMITE_JOUR = (() => {
  const n = Number(Deno.env.get('ARIA_LIMITE_JOUR'));
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 40;
})();

// Garde-fous d'entrée (le client est authentifié, mais pas de confiance aveugle)
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_SYSTEM_CHARS = 40000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const unavailable = (status: number) => json({ error: 'unavailable' }, status);

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isValidMessages(value: unknown): value is ChatMessage[] {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return unavailable(405);

  // 1. Session Supabase de l'appelant
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return unavailable(401);

  // 2. Clé API côté serveur uniquement — JAMAIS journalisée, même en partie
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('[aria] secret ANTHROPIC_API_KEY absent');
    return unavailable(503);
  }
  if (/\s/.test(apiKey)) {
    // Ex. clé collée sur deux lignes : Deno refuserait l'en-tête ET recopierait sa valeur dans l'erreur.
    console.error('[aria] secret ANTHROPIC_API_KEY mal formé (espace ou retour à la ligne) — valeur non journalisée');
    return unavailable(503);
  }

  // 3. Validation de la requête
  let body: { system?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return unavailable(400);
  }
  const { system, messages } = body;
  if (typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS || !isValidMessages(messages)) {
    return unavailable(400);
  }

  // 4. Protocole d'urgence — AVANT tout appel au modèle, sur le dernier message du parent
  const lastUserMessage = messages[messages.length - 1].content;
  const emergency = detectEmergency(lastUserMessage);
  if (emergency) {
    // Alerte signalée sans le contenu du message (minimisation). Persistance + notification
    // des responsables : à brancher quand la table d'alertes existera (phase A, voir todo).
    console.warn('[aria] ALERTE protocole d’urgence — Anthropic non appelé', { category: emergency, user: userData.user.id });
    return json({ text: buildEmergencyMessage(emergency), alert: emergency });
  }

  // 4 bis. Limite quotidienne PAR COMPTE (audit B6) : un appel est réservé de façon atomique en base (clé service,
  // fonction réservée au serveur) AVANT l'appel au modèle ; rendu si le modèle n'a pas répondu. Un message
  // d'urgence ci-dessus n'est jamais compté. Plafond : ARIA_LIMITE_JOUR (secret facultatif), 40 par défaut.
  // Si le compteur est illisible : on refuse (« indisponible ») plutôt que d'ouvrir un coût illimité.
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  const { data: quota, error: quotaError } = await admin.rpc('aria_reserver', {
    p_user: userData.user.id,
    p_limite: LIMITE_JOUR,
  });
  const reservation = Array.isArray(quota) ? quota[0] : null;
  if (quotaError || !reservation) {
    console.error('[aria] compteur quotidien illisible — appel refusé', { status: quotaError ? 503 : 500 });
    return unavailable(503);
  }
  if (!reservation.autorise) {
    // Pas de contenu : seulement des nombres. Réponse 200 + { error: 'limite' } : l'app affiche un message clair.
    console.warn('[aria] limite quotidienne atteinte', { limite: LIMITE_JOUR, utilises: reservation.utilises });
    return json({ error: 'limite', limite: LIMITE_JOUR });
  }
  const rendreAppel = () => admin.rpc('aria_rendre', { p_user: userData.user.id }).then(() => undefined, () => undefined);

  // 5. Appel Anthropic (SDK officiel). Règle fixe ajoutée par le serveur au prompt du client.
  // logLevel 'off' : le SDK n'écrit rien lui-même (ses journaux de débogage contiennent les requêtes).
  const client = new Anthropic({ apiKey, logLevel: 'off' });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `${system}\n\n${REGLE_VOUVOIEMENT}`,
      messages,
    });

    // Refus des classifieurs : pas de repli, simplement « indisponible »
    if (response.stop_reason === 'refusal') {
      console.warn('[aria] refus du modèle', { model: response.model });
      await rendreAppel();
      return unavailable(200);
    }
    console.log('[aria] réponse Anthropic OK', { model: response.model, stop_reason: response.stop_reason });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { text: string }).text)
      .join('\n')
      .trim();

    if (!text) {
      await rendreAppel();
      return unavailable(502);
    }
    return json({ text });
  } catch (error) {
    // Le modèle n'a pas répondu : l'appel réservé est rendu (un échec ne consomme pas la limite de la famille).
    await rendreAppel();
    // Journaux : statut / type / nom d'erreur uniquement. Jamais le message brut ni l'objet d'erreur
    // (une erreur réseau peut recopier les en-têtes, donc la clé).
    if (error instanceof Anthropic.RateLimitError) {
      console.warn('[aria] limite de débit Anthropic', { status: 429 });
      return unavailable(429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[aria] clé Anthropic refusée (révoquée ou invalide) — vérifier le secret', { status: 401 });
      return unavailable(503);
    }
    if (error instanceof Anthropic.NotFoundError) {
      console.error('[aria] modèle ou ressource introuvable — vérifier ARIA_MODEL', { status: 404, model: MODEL });
      return unavailable(502);
    }
    if (error instanceof Anthropic.APIError) {
      const type = (error as { error?: { error?: { type?: string } } }).error?.error?.type ?? null;
      console.error('[aria] erreur API Anthropic', { status: error.status ?? null, type, model: MODEL });
      return unavailable(502);
    }
    console.error('[aria] erreur inattendue', { name: error instanceof Error ? error.name : typeof error });
    return unavailable(500);
  }
});
