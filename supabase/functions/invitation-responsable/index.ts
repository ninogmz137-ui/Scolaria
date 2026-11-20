/**
 * Edge Function « invitation-responsable » (L4) — envoie par email l'invitation d'un second responsable.
 *
 * - Appelée par l'app juste après l'insertion de l'invitation (RLS M2c : seul un responsable de l'enfant
 *   peut inviter). Corps : { invitation_id }.
 * - Lue AVEC LE JWT DE L'APPELANT (RLS) : un compte qui n'est pas responsable de l'enfant ne voit pas
 *   l'invitation → 404, rien n'est envoyé.
 * - Email : Brevo (API transactionnelle). Secrets serveur, jamais dans l'app : BREVO_API_KEY,
 *   EXPEDITEUR_EMAIL (notifications@<domaine>), REPONSE_EMAIL (contact@<domaine>) ; BREVO_API_URL
 *   (facultatif, tests locaux). Tant qu'ils manquent : { envoye: false, raison: 'email_non_configure' }
 *   et l'app le dit (jamais « envoyé » à tort).
 * - Aucune adresse ni aucun contenu d'email n'est journalisé.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { construireEmailInvitation } from '../_shared/emailInvitation.ts';
import { NOM_APP } from '../_shared/marque.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ envoye: false, raison: 'methode' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return json({ envoye: false, raison: 'non_connecte' }, 401);

  let invitationId: unknown;
  try {
    invitationId = (await req.json())?.invitation_id;
  } catch {
    return json({ envoye: false, raison: 'requete' }, 400);
  }
  if (typeof invitationId !== 'string' || !UUID.test(invitationId)) return json({ envoye: false, raison: 'requete' }, 400);

  // Lecture sous RLS : seul un responsable de l'enfant voit l'invitation.
  const { data: inv } = await supabase
    .from('invitations_responsable')
    .select('id, child_id, invited_email, invited_by, statut, expires_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv || inv.statut !== 'en_attente' || new Date(inv.expires_at) <= new Date()) {
    return json({ envoye: false, raison: 'invitation_introuvable' }, 404);
  }
  const [{ data: enfant }, { data: invitant }] = await Promise.all([
    supabase.from('children').select('first_name').eq('id', inv.child_id).maybeSingle(),
    supabase.from('profiles').select('first_name').eq('id', auth.user.id).maybeSingle(),
  ]);
  if (!enfant) return json({ envoye: false, raison: 'invitation_introuvable' }, 404);

  const cle = Deno.env.get('BREVO_API_KEY');
  const expediteur = Deno.env.get('EXPEDITEUR_EMAIL');
  const reponse = Deno.env.get('REPONSE_EMAIL');
  if (!cle || !expediteur || !reponse || /\s/.test(cle)) {
    console.error('[invitation-responsable] envoi non configuré (secrets Brevo / adresses absents) — rien envoyé');
    return json({ envoye: false, raison: 'email_non_configure' });
  }

  const email = construireEmailInvitation({
    prenomInvitant: invitant?.first_name ?? '',
    prenomEnfant: enfant.first_name,
    expireLe: inv.expires_at,
  });
  const r = await fetch(Deno.env.get('BREVO_API_URL') ?? 'https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: NOM_APP, email: expediteur },
      replyTo: { email: reponse },
      to: [{ email: inv.invited_email }],
      subject: email.sujet,
      textContent: email.texte,
      htmlContent: email.html,
    }),
  }).catch(() => null);
  if (!r || !r.ok) {
    // Statut HTTP seulement (0 = aucune réponse : réseau) ; jamais la réponse de Brevo, ni la clé, ni l'adresse.
    console.error('[invitation-responsable] Brevo a refusé l’envoi', { status: r?.status ?? 0 });
    return json({ envoye: false, raison: 'envoi_echoue' }, 502);
  }
  return json({ envoye: true });
});
