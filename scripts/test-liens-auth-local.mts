// Test de bout en bout des liens d'authentification (L3) sur le Supabase LOCAL (jamais la production) :
// inscription → email (Mailpit) → lien → redirection vers l'app avec `code` → échange PKCE → session ;
// mot de passe oublié → email → lien `type=recovery` → échange → nouveau mot de passe → connexion ;
// lien réutilisé → erreur « expiré » reconnue par l'app.
// Prérequis : `npx supabase start` (avec Mailpit), config.toml : redirection scolaria:// + confirmations.
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-liens-auth-local.mts
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { analyserLienAuth } from '../src/services/lienAuth.ts';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
const ANON: string = statut.ANON_KEY;
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(API);
const MAILPIT = 'http://127.0.0.1:54324';
const RETOUR = 'scolaria://auth/callback';
const RECUPERATION = 'scolaria://auth/recuperation';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

function client() {
  const memoire = new Map<string, string>();
  return createClient(API, ANON, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: { getItem: (k) => memoire.get(k) ?? null, setItem: (k, v) => void memoire.set(k, v), removeItem: (k) => void memoire.delete(k) },
    },
  });
}

async function dernierLien(email: string, apres: number): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const liste = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    const msg = (liste.messages ?? []).find((m: { Created: string }) => Date.parse(m.Created) >= apres - 2000);
    if (msg) {
      const detail = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const lien = /href="([^"]+)"/.exec(detail.HTML ?? '')?.[1] ?? /(https?:\/\/\S+)/.exec(detail.Text ?? '')?.[1];
      if (lien) return lien.replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`aucun email pour ${email}`);
}

async function suivre(lien: string): Promise<string> {
  const r = await fetch(lien, { redirect: 'manual' });
  return r.headers.get('location') ?? '';
}

const email = `parent-l3-${Date.now()}@exemple.test`;
const mdp1 = 'Carnet-test-2026!';
const mdp2 = 'Carnet-test-2027!';

// 1. Inscription → confirmation par lien
const a = client();
let debut = Date.now();
const ins = await a.auth.signUp({ email, password: mdp1, options: { emailRedirectTo: RETOUR } });
verifier('inscription acceptée (email à confirmer)', !ins.error && !ins.data.session, ins.error?.message ?? '');
const lienConf = await dernierLien(email, debut);
const retourConf = await suivre(lienConf);
verifier('le lien de confirmation renvoie vers l’app', retourConf.startsWith(RETOUR), retourConf.slice(0, 80));
const analyseConf = analyserLienAuth(retourConf);
verifier('l’app reconnaît un code (pas de récupération)', analyseConf?.type === 'code' && !analyseConf.recuperation, JSON.stringify(analyseConf));
if (analyseConf?.type === 'code') {
  const ech = await a.auth.exchangeCodeForSession(analyseConf.code);
  verifier('échange PKCE → session du bon compte', !ech.error && ech.data.session?.user.email === email, ech.error?.message ?? '');
  verifier('compte confirmé', !!ech.data.user?.email_confirmed_at);
}

// 2. Lien réutilisé → erreur « expiré »
const retourReutilise = await suivre(lienConf);
const analyseReut = analyserLienAuth(retourReutilise);
verifier('lien réutilisé → l’app affiche « expiré »', analyseReut?.type === 'erreur' && analyseReut.expire, retourReutilise.slice(0, 120));

// 3. Mot de passe oublié → lien de récupération → nouveau mot de passe
const b = client();
debut = Date.now();
await new Promise((r) => setTimeout(r, 1100)); // max_frequency local = 1 s
const rec = await b.auth.resetPasswordForEmail(email, { redirectTo: RECUPERATION });
verifier('demande de réinitialisation acceptée', !rec.error, rec.error?.message ?? '');
const lienRec = await dernierLien(email, debut);
const retourRec = await suivre(lienRec);
const analyseRec = analyserLienAuth(retourRec);
verifier('le lien de réinitialisation revient dans l’app en récupération', analyseRec?.type === 'code' && analyseRec.recuperation, retourRec.slice(0, 100));
if (analyseRec?.type === 'code') {
  const ech = await b.auth.exchangeCodeForSession(analyseRec.code);
  verifier('échange PKCE (récupération) → session', !ech.error && !!ech.data.session, ech.error?.message ?? '');
  const maj = await b.auth.updateUser({ password: mdp2 });
  verifier('nouveau mot de passe enregistré', !maj.error, maj.error?.message ?? '');
}
const c = client();
const ancien = await c.auth.signInWithPassword({ email, password: mdp1 });
verifier('l’ancien mot de passe ne marche plus', !!ancien.error);
const nouveau = await c.auth.signInWithPassword({ email, password: mdp2 });
verifier('connexion avec le nouveau mot de passe', !nouveau.error, nouveau.error?.message ?? '');

// 4. Un code échangé sur un AUTRE appareil (sans le vérificateur PKCE) est refusé
debut = Date.now();
await new Promise((r) => setTimeout(r, 1100));
await client().auth.resetPasswordForEmail(email, { redirectTo: RECUPERATION });
const autre = analyserLienAuth(await suivre(await dernierLien(email, debut)));
if (autre?.type === 'code') {
  const ech = await client().auth.exchangeCodeForSession(autre.code);
  verifier('code ouvert sur un autre appareil → refusé (PKCE)', !!ech.error);
} else verifier('code ouvert sur un autre appareil → refusé (PKCE)', false, 'pas de code');

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
