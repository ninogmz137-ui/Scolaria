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
 * - Protocole d'urgence AVANT tout appel au modèle, sur TOUS les messages `user` reçus : mot-clé critique →
 *   message fixe (3114 / 3018 / 119 + 112), aucun appel Anthropic, aucun décompte, journal = catégorie seule
 *   (ni contenu, ni identifiant de compte).
 * - Réponse au client : { text } | { text, alert } | { error: 'unavailable' } — jamais de détail technique.
 * - Requête : { child_id | null, messages }. Les consignes du modèle (prompt système) sont construites ICI
 *   (_shared/ariaPrompt.ts) : prénom + niveau de l'enfant lus SOUS RLS avec le jeton de l'appelant, rien d'autre.
 *   Un champ `system` envoyé par le client (ancienne app, requête forgée) est ignoré, sans erreur.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildEmergencyMessage } from '../_shared/emergency.ts';
import { isValidMessages, urgenceDansMessages } from '../_shared/ariaRequete.ts';
import { MAX_TOKENS, construirePromptSysteme, contexteEnfant, lireChildId, type ContexteEnfant } from '../_shared/ariaPrompt.ts';
import { ASSISTANT } from '../_shared/marque.ts';

const MODEL = Deno.env.get('ARIA_MODEL') ?? 'claude-sonnet-5';

/** Plafond d'appels au modèle par compte et par jour (jour de Paris). Secret facultatif ARIA_LIMITE_JOUR (1 à 1000). */
const LIMITE_JOUR = (() => {
  const n = Number(Deno.env.get('ARIA_LIMITE_JOUR'));
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 40;
})();

// Garde-fous d'entrée : MAX_MESSAGES et MAX_MESSAGE_CHARS vivent dans _shared/ariaRequete.ts (isValidMessages).

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
  // Corps attendu : { child_id | null, messages }. Un champ `system` (ancienne app) est IGNORÉ, sans erreur :
  // les consignes du modèle sont construites ici, jamais par le client.
  let body: { child_id?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return unavailable(400);
  }
  if (body === null || typeof body !== 'object') return unavailable(400);
  const { messages } = body;
  if (!isValidMessages(messages)) {
    return unavailable(400);
  }

  // 4. Protocole d'urgence — AVANT tout appel au modèle et avant tout décompte, sur TOUS les messages du parent
  // reçus (pas seulement le dernier) : un message de détresse resté dans l'historique n'atteint jamais le modèle.
  const emergency = urgenceDansMessages(messages);
  if (emergency) {
    // Journal : texte fixe + catégorie. Ni le contenu, ni l'identifiant du compte (l'alerte privée à son auteur
    // est enregistrée par l'app dans alertes_urgence, sous RLS).
    console.warn('[aria] ALERTE protocole d’urgence — Anthropic non appelé', { category: emergency });
    return json({ text: buildEmergencyMessage(emergency, ASSISTANT), alert: emergency });
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

  // 5. Contexte de l'enfant, lu SOUS RLS avec le jeton de l'appelant (client `supabase`, jamais la clé service) :
  // prénom + niveau, rien d'autre. Enfant illisible (autre foyer, effacement en cours, identifiant inconnu,
  // erreur de lecture) → « aucun enfant », sans erreur qui révélerait son existence.
  const childId = lireChildId(body.child_id);
  let enfant: ContexteEnfant | null = null;
  if (childId) {
    const { data: ligne } = await supabase.from('children').select('first_name, classe').eq('id', childId).maybeSingle();
    enfant = contexteEnfant(ligne);
  }

  // 6. Appel Anthropic (SDK officiel). Consignes construites ICI (ariaPrompt.ts), jamais reçues du client.
  // logLevel 'off' : le SDK n'écrit rien lui-même (ses journaux de débogage contiennent les requêtes).
  const client = new Anthropic({ apiKey, logLevel: 'off' });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: construirePromptSysteme(enfant, new Date()),
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
