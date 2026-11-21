// Données de l'essai Redmi du lot 5, base LOCALE seulement (jamais la production). Ne recrée AUCUN compte.
// parent-3b (Sophie) reçoit un second enfant SANS classe, « Noé » (s'il n'existe pas déjà), pour voir sur le Redmi :
//   - le « + » de Noé sans absence ni message, celui de Lina avec ;
//   - la pastille de l'avatar quand Noé est affiché et que Lina a du nouveau, et le décompte du sélecteur.
// Affiche ensuite ce que Lina a à traiter (mots, devoirs pour demain) pour savoir quoi attendre.
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot5-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];

const sophie = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
// Compte visé : parent-3b par défaut ; COMPTE=separe-3b pour le compte connecté sur le Redmi.
const COMPTE = `${process.env.COMPTE ?? 'parent-3b'}@exemple.test`;
const { data: s, error } = await sophie.auth.signInWithPassword({ email: COMPTE, password: MDP });
if (error) throw new Error(error.message);
const { data: rs } = await sophie.from('responsables').select('child_id, children(first_name)').eq('user_id', s.user.id);
console.log(`Enfants de ${COMPTE} :`, rs.map((r) => r.children?.first_name).join(', '));
if (!rs.some((r) => r.children?.first_name === 'Noé')) {
  const { error: e } = await sophie.rpc('create_child', { p_first_name: 'Noé', p_last_name: 'Essai', p_age: 6, p_classe: 'CP', p_color: '#0E7490' });
  console.log(e ? `Noé : ÉCHEC ${e.message}` : 'Noé créé (sans classe).');
}
const lina = rs.find((r) => r.children?.first_name === 'Lina')?.child_id;
const { data: mots } = await sophie.from('mot_carnets').select('mot_id').eq('child_id', lina);
const { data: devoirs } = await sophie.from('agenda_events').select('title, start_time, is_done').eq('child_id', lina).eq('event_type', 'devoir');
console.log(`Lina : ${mots?.length ?? 0} mot(s) dans le carnet ; devoirs :`, (devoirs ?? []).map((d) => `${d.title} ${d.start_time?.slice(0, 10)} ${d.is_done ? 'fait' : 'à faire'}`).join(' | ') || 'aucun');
