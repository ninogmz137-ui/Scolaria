// Rendez-vous fixes de TEST du lot 4c pour Lina, base LOCALE seulement (jamais la production), APRÈS
// seed-lot3b-local.mjs. Ne recrée pas les comptes (une session ouverte sur le Redmi reste valide) :
//   · « Piscine · tous les jeudis » (maillot, bonnet, serviette), ajoutée par Sophie ;
//   · « Bibliothèque · tous les mardis » (livre à rendre), ajoutée par Marc → « Ajouté par Marc » ;
//   · « Maillot » coché par Marc pour la semaine en cours → « Coché par Marc · [heure] » chez Sophie.
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot4c-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { aujourdhuiParis, lundiDuJour } from '../src/utils/jourParis.ts';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];
async function connecter(email) {
  const c = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: MDP });
  if (error) throw new Error(`${email} : ${error.message}`);
  return { c, moi: data.user.id };
}
const echoue = (quoi, e) => {
  if (e) throw new Error(`${quoi} : ${e.message}`);
};

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc } = await connecter('coparent-3b@exemple.test');
const { data: rs } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = rs[0].child_id;
await sophie.from('rendez_vous_fixes').delete().eq('child_id', lina);
const { data: piscine, error: e1 } = await sophie.from('rendez_vous_fixes')
  .insert({ child_id: lina, titre: 'Piscine', jour_semaine: 4, categorie: 'eps', a_prevoir: ['Maillot', 'Bonnet', 'Serviette'] }).select('id').single();
echoue('piscine', e1);
echoue('bibliothèque', (await marc.from('rendez_vous_fixes').insert({ child_id: lina, titre: 'Bibliothèque', jour_semaine: 2, a_prevoir: ['Livre à rendre'] })).error);
echoue('coche de Marc', (await marc.from('rendez_vous_coches').insert({ rdv_id: piscine.id, semaine: lundiDuJour(aujourdhuiParis()), item: 'Maillot' })).error);
console.log('Rendez-vous fixes de test du lot 4c prêts pour Lina : Piscine (jeudi, Sophie), Bibliothèque (mardi, Marc), « Maillot » coché par Marc cette semaine.');
