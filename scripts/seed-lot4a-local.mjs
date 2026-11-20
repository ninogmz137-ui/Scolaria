// Devoirs de test pour vérifier le lot 4a sur le Redmi, base LOCALE seulement (jamais la production).
// À lancer APRÈS scripts/seed-lot3b-local.mjs (comptes et enfants). Pour Lina :
//   · « Poésie : Le Corbeau et le Renard » pour demain, COCHÉ PAR MARC (coparent-3b) → « Coché par Marc · [heure] » ;
//   · « Tables de 7 » pour demain, non coché ;
//   · « Lire le chapitre 4 » dans 3 jours ;
//   · « Fiche de calcul » pour aujourd'hui (fin de liste, « Pour aujourd'hui »).
// Les coches passent par l'API sous RLS, avec le compte de Marc : l'auteur et l'heure sont posés par le serveur (M41).
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot4a-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { aujourdhuiParis, decalerJour, minuitParis } from '../src/utils/jourParis.ts';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];

async function connecter(email) {
  const c = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: MDP });
  if (error) throw new Error(`${email} : ${error.message}`);
  return { c, moi: data.user.id };
}
const a8h = (jour) => new Date(minuitParis(jour).getTime() + 8 * 3600000).toISOString();

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc } = await connecter('coparent-3b@exemple.test');
const { data: enfants } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = enfants[0].child_id;
const auj = aujourdhuiParis();

await sophie.from('agenda_events').delete().eq('child_id', lina).eq('event_type', 'devoir');
const devoirs = [
  { title: 'Poésie : Le Corbeau et le Renard', subject: 'Français', jour: decalerJour(auj, 1), cocheParMarc: true },
  { title: 'Tables de 7', subject: 'Mathématiques', jour: decalerJour(auj, 1) },
  { title: 'Lire le chapitre 4', subject: 'Français', jour: decalerJour(auj, 3) },
  { title: 'Fiche de calcul', subject: 'Mathématiques', jour: auj },
];
for (const d of devoirs) {
  const { data, error } = await sophie.from('agenda_events')
    .insert({ child_id: lina, parent_id: idSophie, title: d.title, subject: d.subject, event_type: 'devoir', start_time: a8h(d.jour) })
    .select('id').single();
  if (error) throw new Error(`devoir « ${d.title} » : ${error.message}`);
  if (d.cocheParMarc) {
    const { error: e2 } = await marc.from('agenda_events').update({ is_done: true }).eq('id', data.id);
    if (e2) throw new Error(`coche de Marc : ${e2.message}`);
  }
}
console.log(`Devoirs de test du lot 4a prêts pour Lina (${devoirs.length}), dont 1 coché par Marc.`);
