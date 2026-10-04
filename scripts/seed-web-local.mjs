// Données de TEST pour l'aperçu web local (jamais la production) : un compte parent confirmé, deux enfants de niveaux
// différents (Laia CP, Evan CM2), et un événement d'agenda AUJOURD'HUI pour Laia.
// Compte : demo-web@exemple.test — mot de passe de test : voir MDP ci-dessous (valeur factice, base locale uniquement).
// Usage : node scripts/seed-web-local.mjs   (idempotent : recrée le compte)
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
if (!/127\.0\.0\.1|localhost/.test(statut.API_URL)) throw new Error('Refus : Supabase LOCAL seulement.');
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = 'demo-web@exemple.test';
const MDP = 'Demo-web-2026!';

const { data: existants } = await admin.auth.admin.listUsers();
for (const u of existants?.users ?? []) if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
const { data: u, error } = await admin.auth.admin.createUser({ email: EMAIL, password: MDP, email_confirm: true, user_metadata: { family_name: 'Demo' } });
if (error) throw new Error(error.message);
const client = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
const { error: e2 } = await client.auth.signInWithPassword({ email: EMAIL, password: MDP });
if (e2) throw new Error(e2.message);
const creer = async (prenom, classe, couleur) => {
  const { data, error } = await client.rpc('create_child', { p_first_name: prenom, p_last_name: 'Demo', p_birth_date: null, p_age: 8, p_classe: classe, p_school: 'École de démonstration', p_color: couleur });
  if (error) throw new Error(error.message);
  return data?.id ?? data?.[0]?.id;
};
const laia = await creer('Laia', 'CP', '#BE185D');
await creer('Evan', 'CM2', '#0369A1');
const bientot = new Date(Date.now() + 3600_000);
const { error: e3 } = await client.from('agenda_events').insert({ child_id: laia, parent_id: u.user.id, title: 'Sortie à la médiathèque', event_type: 'sortie', start_time: bientot.toISOString(), location: 'Médiathèque' });
if (e3) throw new Error(e3.message);
console.log(`Compte de test prêt : ${EMAIL} (Laia CP avec un événement aujourd'hui, Evan CM2).`);
