/**
 * Edge Function « envoyer-notifications » (lot 7a, plan validé le 22 nov. 2026).
 *
 * - Appelée UNIQUEMENT par les tâches planifiées (pg_cron + pg_net, M48) avec une clé de service en Authorization : tout
 *   autre appelant → 401, rien n'est fait. Déployée avec --no-verify-jwt : la vérification est faite ici (comme
 *   executer-effacements).
 * - mode « file » (chaque minute) : éléments dus de la file M47 (notifications_dues), regroupés par parent ET par enfant ;
 *   « essentielles » désactivé → rien n'est envoyé (marqué « coupe ») ; aucun téléphone → « sans_appareil » ; sinon un
 *   message par téléphone, via Expo.
 * - mode « resume » (16 h et 17 h UTC) : résumé de 18 h heure de Paris (notifications_resume : la base ne renvoie rien à
 *   une autre heure), un message par parent et par enfant qui a quelque chose, une fois par jour.
 * - Textes : supabase/functions/_shared/notifications.ts, VERROUILLÉS par test (prénom, type, expéditeur ; jamais de contenu).
 * - ENVOI SIMULÉ : sans le secret EXPO_ACCESS_TOKEN, ou avec SIMULER_ENVOI=1, rien ne part vers Expo ; la réponse contient
 *   les textes préparés (jamais les jetons) et les éléments sont marqués « simule ». En simulation seulement, le corps peut
 *   fixer `maintenant` (essai du résumé de 18 h).
 * - Jetons refusés par Expo (DeviceNotRegistered) : désactivés (appareils_desactiver).
 * - Journaux : des compteurs seulement, jamais un prénom, un jeton ni un identifiant.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  composerNotification,
  composerResume,
  versExpo,
  type ElementFile,
  type MessageExpo,
  type Notification,
  type TypeNotification,
} from '../_shared/notifications.ts';

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
const PAQUET_EXPO = 100;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function egal(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Clé de SERVICE ? (égale à celle de la fonction, ou validée par l'effet : seule une clé service lit la file). */
async function cleServiceValide(recue: string, cleFonction: string): Promise<boolean> {
  if (!recue) return false;
  if (egal(recue, cleFonction)) return true;
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', recue, { auth: { persistSession: false } });
    const { error } = await client.rpc('notifications_dues', { p_limite: 1 });
    return !error;
  } catch {
    return false;
  }
}

interface Due {
  id: string;
  destinataire: string;
  child_id: string;
  prenom: string | null;
  type: TypeNotification;
  expediteur: string | null;
  ref_id: string | null;
  essentielles: boolean;
  jetons: string[];
}

/** Envoie à Expo (par paquets de 100) ; renvoie les jetons refusés (DeviceNotRegistered) et le nombre d'échecs. */
async function envoyerExpo(messages: MessageExpo[], jetonExpo: string): Promise<{ morts: string[]; echecs: number }> {
  const morts: string[] = [];
  let echecs = 0;
  for (let i = 0; i < messages.length; i += PAQUET_EXPO) {
    const paquet = messages.slice(i, i + PAQUET_EXPO);
    const r = await fetch(URL_EXPO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${jetonExpo}` },
      body: JSON.stringify(paquet),
    });
    if (!r.ok) throw new Error(`expo ${r.status}`);
    const corps = await r.json();
    const tickets = (corps?.data ?? []) as { status: string; details?: { error?: string } }[];
    tickets.forEach((t, k) => {
      if (t.status !== 'ok') {
        echecs++;
        if (t.details?.error === 'DeviceNotRegistered') morts.push(paquet[k].to);
      }
    });
  }
  return { morts, echecs };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ raison: 'methode' }, 405);
  const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const recue = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!(await cleServiceValide(recue, cle))) return json({ raison: 'non_autorise' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', cle, { auth: { persistSession: false } });
  const jetonExpo = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';
  const simuler = !jetonExpo || Deno.env.get('SIMULER_ENVOI') === '1';
  let corps: { mode?: string; maintenant?: string } = {};
  try {
    corps = await req.json();
  } catch {
    corps = {};
  }
  const mode = corps.mode === 'resume' ? 'resume' : 'file';
  // L'heure n'est réglable qu'en simulation (essai du résumé de 18 h) ; en réel, c'est toujours maintenant.
  const maintenant = simuler && corps.maintenant ? new Date(corps.maintenant).toISOString() : new Date().toISOString();

  // Préparation : une notification par (parent, enfant), un message Expo par téléphone.
  const preparees: { notification: Notification; jetons: string[] }[] = [];
  const resultats: { ids: string[]; resultat: string }[] = [];
  const parentsResume: string[] = [];

  if (mode === 'file') {
    const { data, error } = await admin.rpc('notifications_dues', { p_maintenant: maintenant, p_limite: 500 });
    if (error) return json({ raison: 'lecture' }, 500);
    const dues = (data ?? []) as Due[];
    const groupes = new Map<string, Due[]>();
    for (const d of dues) {
      const k = `${d.destinataire}|${d.child_id}`;
      groupes.set(k, [...(groupes.get(k) ?? []), d]);
    }
    for (const lignes of groupes.values()) {
      const d0 = lignes[0];
      const ids = lignes.map((l) => l.id);
      if (!d0.essentielles) {
        resultats.push({ ids, resultat: 'coupe' });
        continue;
      }
      if (!d0.jetons.length) {
        resultats.push({ ids, resultat: 'sans_appareil' });
        continue;
      }
      const elements: ElementFile[] = lignes.map((l) => ({ type: l.type, expediteur: l.expediteur, ref_id: l.ref_id }));
      preparees.push({ notification: composerNotification(d0.prenom, d0.child_id, elements), jetons: d0.jetons });
      resultats.push({ ids, resultat: simuler ? 'simule' : 'envoye' });
    }
  } else {
    const { data, error } = await admin.rpc('notifications_resume', { p_maintenant: maintenant });
    if (error) return json({ raison: 'lecture' }, 500);
    for (const r of (data ?? []) as { destinataire: string; child_id: string; prenom: string | null; mots: number; absences: number; devoirs: number; jetons: string[] }[]) {
      const n = composerResume(r.prenom, r.child_id, { mots: r.mots, absences: r.absences, devoirs: r.devoirs });
      if (n && r.jetons?.length) preparees.push({ notification: n, jetons: r.jetons });
      if (!parentsResume.includes(r.destinataire)) parentsResume.push(r.destinataire);
    }
  }

  const messages = preparees.flatMap((p) => p.jetons.map((j) => versExpo(j, p.notification)));
  let morts: string[] = [];
  let echecs = 0;
  if (!simuler && messages.length) {
    try {
      ({ morts, echecs } = await envoyerExpo(messages, jetonExpo));
    } catch {
      // Expo injoignable : rien n'est marqué, tout repartira au passage suivant.
      return json({ raison: 'expo_injoignable' }, 502);
    }
  }
  for (const r of resultats) await admin.rpc('notifications_marquer', { p_ids: r.ids, p_resultat: r.resultat });
  if (mode === 'resume' && parentsResume.length) await admin.rpc('notifications_resume_marquer', { p_users: parentsResume, p_maintenant: maintenant });
  if (morts.length) await admin.rpc('appareils_desactiver', { p_jetons: morts });

  console.log(JSON.stringify({ mode, simule: simuler, notifications: preparees.length, messages: messages.length, echecs, jetons_desactives: morts.length }));
  return json({
    mode,
    simule: simuler,
    notifications: preparees.length,
    messages: messages.length,
    // Simulation : les textes préparés et leur cible (jamais les jetons), pour vérifier ce qui partirait.
    ...(simuler ? { apercu: preparees.map((p) => ({ corps: p.notification.corps, cible: p.notification.donnees.cible, telephones: p.jetons.length })) } : {}),
  });
});
