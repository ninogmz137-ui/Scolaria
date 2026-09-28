// Test de bout en bout de l'invitation (L4) sur le Supabase LOCAL (jamais la production) :
// A (responsable) invite b@… → Edge Function « invitation-responsable » → email vers un FAUX Brevo local
// (contenu vérifié) ; C (étranger) ne peut pas faire envoyer l'invitation ; B accepte via mes_invitations
// + respond_invitation et lit ensuite le carnet.
// Prérequis : `npx supabase start` ; M24 appliquée en local ; la fonction servie avec
//   npx supabase functions serve invitation-responsable --env-file scripts/invitation-local.env --no-verify-jwt
//   (BREVO_API_URL=http://host.docker.internal:54399/v3/smtp/email, clé et adresses FACTICES).
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
if (!/127\.0\.0\.1|localhost/.test(API)) throw new Error('Refus : ce test ne tourne que sur le Supabase LOCAL.');
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

// Faux Brevo : enregistre la dernière requête.
let recu: { cle?: string; corps?: any } | null = null;
const faux = createServer((req, res) => {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    recu = { cle: req.headers['api-key'] as string, corps: JSON.parse(data || '{}') };
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end('{"messageId":"test"}');
  });
});
await new Promise<void>((r) => faux.listen(54399, '0.0.0.0', () => r()));

const t = Date.now();
const comptes = { a: `claire-${t}@exemple.test`, b: `marc-${t}@exemple.test`, c: `inconnu-${t}@exemple.test` };
const mdp = 'Carnet-test-2026!';
for (const [k, email] of Object.entries(comptes)) {
  const { error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
  if (error) throw new Error(`création ${k} : ${error.message}`);
}
const session = async (email: string) => {
  const c = createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: mdp });
  if (error) throw new Error(error.message);
  return c;
};
const A = await session(comptes.a);
const { data: moiA } = await A.auth.getUser();
await admin.from('profiles').update({ first_name: 'Claire', family_name: 'Moreau' }).eq('id', moiA.user!.id);
const { data: enfant, error: eErr } = await A.rpc('create_child', { p_first_name: 'Léa', p_last_name: 'Moreau', p_birth_date: null, p_age: 5, p_classe: 'GS', p_school: 'École test' });
verifier('A crée l’enfant', !eErr, eErr?.message ?? '');
const childId = (enfant as any)?.id ?? (Array.isArray(enfant) ? enfant[0]?.id : undefined);
const { data: inv, error: iErr } = await A.from('invitations_responsable').insert({ child_id: childId, invited_by: moiA.user!.id, invited_email: comptes.b }).select('id').single();
verifier('A enregistre l’invitation de B', !iErr, iErr?.message ?? '');

// Envoi par la fonction, avec le JWT de A
const envoi = await A.functions.invoke('invitation-responsable', { body: { invitation_id: inv!.id } });
verifier('la fonction répond « envoyé »', envoi.data?.envoye === true, JSON.stringify(envoi.data ?? envoi.error?.message));
verifier('Brevo reçoit la clé (secret serveur)', recu?.cle === 'cle-factice-locale');
verifier('destinataire = adresse invitée', recu?.corps?.to?.[0]?.email === comptes.b, JSON.stringify(recu?.corps?.to));
verifier('sujet « Claire vous invite à suivre le carnet de Léa »', recu?.corps?.subject === 'Claire vous invite à suivre le carnet de Léa', recu?.corps?.subject);
verifier('réponse vers l’adresse de contact (jamais de no-reply)', recu?.corps?.replyTo?.email === 'contact@exemple.test' && !/no-?reply/i.test(JSON.stringify(recu?.corps)));
verifier('aucun nom de famille dans l’email', !/Moreau/.test(JSON.stringify(recu?.corps)));

// C (étranger) ne peut pas faire envoyer l'invitation de A
recu = null;
const C = await session(comptes.c);
const intrus = await C.functions.invoke('invitation-responsable', { body: { invitation_id: inv!.id } });
verifier('un étranger ne peut pas faire envoyer l’invitation', recu === null && intrus.data?.envoye !== true);

// B accepte
const B = await session(comptes.b);
const { data: liste } = await B.rpc('mes_invitations');
verifier('B voit l’invitation (prénoms seuls)', Array.isArray(liste) && liste[0]?.prenom_enfant === 'Léa' && liste[0]?.prenom_invitant === 'Claire', JSON.stringify(liste));
const { data: rep, error: rErr } = await B.rpc('respond_invitation', { p_invitation_id: inv!.id, p_accept: true });
verifier('B accepte', rep === 'acceptee', rErr?.message ?? String(rep));
const { data: vus } = await B.from('children').select('first_name');
verifier('B lit maintenant le carnet de Léa', (vus ?? []).some((e: any) => e.first_name === 'Léa'));

faux.close();
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
