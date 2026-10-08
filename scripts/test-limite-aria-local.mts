// Test de bout en bout de la LIMITE QUOTIDIENNE d'Aria (M31) sur le Supabase LOCAL (jamais la production).
// L'Edge Function « aria » tourne en local, son « Anthropic » est un FAUX serveur de ce script (aucune clé réelle,
// aucun appel au vrai modèle). Prouve : plafond par compte, message clair, appel rendu si le modèle échoue,
// message d'urgence jamais compté, appels simultanés exacts, compteur illisible côté app, journaux sans contenu.
// Prérequis : `npx supabase start` ; M31 appliquée en local ; fonction servie avec le fichier d'environnement de test :
//   npx supabase functions serve aria --env-file <fichier> (voir `npm run test:limite-aria-local`, qui s'en charge).
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(API);
const LIMITE = Number(process.env.ARIA_LIMITE_TEST ?? '3');
const PORT = Number(process.env.FAUX_ANTHROPIC_PORT ?? '18080');
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

// ── Faux serveur Anthropic ──
let appelsModele = 0;
let mode: 'ok' | 'echec' = 'ok';
const faux = createServer((req, res) => {
  let corps = '';
  req.on('data', (c) => (corps += c));
  req.on('end', () => {
    appelsModele++;
    res.setHeader('content-type', 'application/json');
    if (mode === 'echec') {
      res.statusCode = 400; // pas de nouvelle tentative du SDK
      res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'faux échec de test' } }));
      return;
    }
    res.end(JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-5',
      content: [{ type: 'text', text: 'Réponse factice du test.' }], stop_reason: 'end_turn', stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
  });
});
await new Promise<void>((r) => faux.listen(PORT, '0.0.0.0', r));

const t = Date.now();
const mdp = 'Carnet-test-2026!';
async function creerParent(prefixe: string) {
  const email = `${prefixe}-${t}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(error.message);
  const c = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: mdp });
  if (e2) throw new Error(e2.message);
  return { id: data.user!.id, client: c, jeton: s.session!.access_token };
}
type Parent = Awaited<ReturnType<typeof creerParent>>;
const MARQUEUR = `MARQUEUR-SECRET-${t}`;
async function demander(p: Parent, message = `Bonjour ${MARQUEUR}, comment aider mon enfant à lire ?`) {
  const r = await fetch(`${API}/functions/v1/aria`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${p.jeton}`, apikey: statut.ANON_KEY },
    body: JSON.stringify({ system: 'Tu es Aria.', messages: [{ role: 'user', content: message }] }),
  });
  return { statut: r.status, corps: (await r.json().catch(() => ({}))) as { text?: string; error?: string; limite?: number; alert?: string } };
}
const utilises = (p: Parent) => Number(sql(`select coalesce((select nb from public.aria_usage_quotidien where user_id = '${p.id}' and jour = (now() at time zone 'Europe/Paris')::date), 0)`));

try {
  // ── T1 : sous la limite, puis refus clair au-delà ; le modèle n'est jamais appelé au-delà ──
  const A = await creerParent('aria-a');
  const reponses = [];
  for (let i = 0; i < LIMITE; i++) reponses.push(await demander(A));
  verifier(`T1 ${LIMITE} premiers appels répondus`, reponses.every((r) => r.statut === 200 && r.corps.text === 'Réponse factice du test.'), JSON.stringify(reponses.map((r) => r.corps)));
  const avant = appelsModele;
  const refus = await demander(A);
  verifier('T2 appel suivant : { error: "limite", limite } (HTTP 200)', refus.statut === 200 && refus.corps.error === 'limite' && refus.corps.limite === LIMITE, JSON.stringify(refus));
  verifier('T2 bis le modèle n’est PAS appelé au-delà de la limite', appelsModele === avant, `${appelsModele} vs ${avant}`);
  verifier('T2 ter compteur = limite (pas au-delà)', utilises(A) === LIMITE, String(utilises(A)));

  // ── T3 : un autre compte n'est pas touché ──
  const B = await creerParent('aria-b');
  const rb = await demander(B);
  verifier('T3 autre compte non concerné', rb.corps.text === 'Réponse factice du test.' && utilises(B) === 1, JSON.stringify(rb));

  // ── T4 : échec du modèle → appel rendu (la famille garde ses appels) ──
  const C = await creerParent('aria-c');
  mode = 'echec';
  const e1 = await demander(C);
  const e2 = await demander(C);
  mode = 'ok';
  verifier('T4 le modèle échoue → « indisponible » et compteur rendu à 0', e1.corps.error === 'unavailable' && e2.corps.error === 'unavailable' && utilises(C) === 0, `${JSON.stringify([e1.corps, e2.corps])} compteur=${utilises(C)}`);
  const apres = [];
  for (let i = 0; i < LIMITE; i++) apres.push(await demander(C));
  const encore = await demander(C);
  verifier(`T4 bis après 2 échecs : ${LIMITE} réponses possibles puis limite`, apres.every((r) => r.corps.text) && encore.corps.error === 'limite', JSON.stringify([apres.map((r) => r.corps), encore.corps]));

  // ── T5 : message d'urgence : jamais compté, jamais envoyé au modèle ──
  const D = await creerParent('aria-d');
  const avantUrgence = appelsModele;
  const urgences = [];
  for (let i = 0; i < LIMITE + 2; i++) urgences.push(await demander(D, 'Je pense au suicide'));
  verifier('T5 urgences : message fixe, compteur à 0, modèle non appelé', urgences.every((r) => r.corps.alert) && utilises(D) === 0 && appelsModele === avantUrgence, `compteur=${utilises(D)}`);
  const normal = await demander(D);
  verifier('T5 bis après les urgences : appel normal toujours possible', normal.corps.text === 'Réponse factice du test.');

  // ── T6 : appels SIMULTANÉS : exactement LIMITE réponses ──
  const E = await creerParent('aria-e');
  const modeleAvant = appelsModele;
  const lot = await Promise.all(Array.from({ length: LIMITE + 7 }, () => demander(E)));
  const reussis = lot.filter((r) => r.corps.text).length;
  const limites = lot.filter((r) => r.corps.error === 'limite').length;
  verifier(`T6 ${LIMITE + 7} appels simultanés → exactement ${LIMITE} réponses, ${7} refus`, reussis === LIMITE && limites === 7 && appelsModele - modeleAvant === LIMITE && utilises(E) === LIMITE, `réussis=${reussis} limites=${limites} modèle=${appelsModele - modeleAvant} compteur=${utilises(E)}`);

  // ── T7 : le compteur est illisible et inmodifiable depuis l'app ──
  const lecture = await A.client.from('aria_usage_quotidien').select('*');
  const maj = await A.client.from('aria_usage_quotidien').update({ nb: 0 }).eq('user_id', A.id);
  const rpc = await A.client.rpc('aria_rendre', { p_user: A.id });
  verifier('T7 lecture, modification et aria_rendre refusées à un compte connecté', !!lecture.error && !!maj.error && !!rpc.error, JSON.stringify([lecture.error?.code, maj.error?.code, rpc.error?.code]));
  verifier('T7 bis le compteur n’a pas bougé', utilises(A) === LIMITE);

  // ── T8 : sans session → refusé avant tout compteur ──
  const anonyme = await fetch(`${API}/functions/v1/aria`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: statut.ANON_KEY }, body: '{}' });
  verifier('T8 sans session : refusé', anonyme.status === 401);

  // ── T9 : journaux de la fonction : aucun contenu de message ──
  await new Promise((r) => setTimeout(r, 1500));
  const journaux = execSync('docker logs supabase_edge_runtime_Scolaria 2>&1', { encoding: 'utf8', maxBuffer: 1 << 26 });
  verifier('T9 le texte des messages n’apparaît dans AUCUN journal', !journaux.includes(MARQUEUR));
  verifier('T9 bis la limite est journalisée avec des nombres seulement', /limite quotidienne atteinte \{ limite: \S*3\S*, utilises: \S*3\S* \}/.test(journaux) && !journaux.includes('Je pense au suicide'));
} finally {
  faux.close();
}

console.log(`\n${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
