// Essai de bout en bout du lot 4a (devoirs, « Coché par ») contre le Supabase LOCAL (jamais la production), avec
// les MÊMES requêtes que l'app (src/services/devoirsService.ts), sous RLS, avec les comptes de
// scripts/seed-lot3b-local.mjs :
//   parent-3b (Sophie) et coparent-3b (Marc) : responsables de Lina, même foyer ;
//   separe-3b (Julien) : responsable de Lina dans un autre foyer (garde partagée : la coche est partagée) ;
//   parent2-3b (Karim) : parent de Tom → ne voit ni ne coche les devoirs de Lina.
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot4a-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { aujourdhuiParis, demainParis, minuitParis, jourParis, bornesParis, decalerJour } from '../src/utils/jourParis.ts';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];

let ok = 0;
let echecs = 0;
const verifier = (nom, cond, detail = '') => {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  cond ? ok++ : echecs++;
};
async function connecter(email) {
  const c = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: MDP });
  if (error) throw new Error(`${email} : ${error.message}`);
  return { c, moi: data.user.id };
}
// Mêmes requêtes que devoirsService.
const chargerDevoirs = (c, childId) =>
  c.from('agenda_events').select('*').eq('child_id', childId).eq('event_type', 'devoir')
    .gte('start_time', minuitParis(aujourdhuiParis()).toISOString()).order('start_time').limit(200);
const cocher = (c, id, fait) =>
  c.from('agenda_events').update({ is_done: fait, updated_at: new Date().toISOString() }).eq('id', id).select().single();

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc, moi: idMarc } = await connecter('coparent-3b@exemple.test');
const { c: julien } = await connecter('separe-3b@exemple.test');
const { c: karim } = await connecter('parent2-3b@exemple.test');
const { data: enfants } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = enfants[0].child_id;

// Sophie ajoute un devoir pour demain (8 h, heure de Paris).
const demain8h = new Date(minuitParis(demainParis()).getTime() + 8 * 3600000).toISOString();
const { data: cree, error: eCree } = await sophie.from('agenda_events')
  .insert({ child_id: lina, parent_id: idSophie, title: 'T4a Poésie', event_type: 'devoir', start_time: demain8h, fait_par: idMarc })
  .select().single();
verifier('Sophie ajoute un devoir pour demain', !eCree && !!cree, eCree?.message);
verifier('à la création, fait_par imposé par le client est ignoré', cree?.fait_par === null && cree?.fait_le === null);
verifier('échéance = demain en heure de Paris', jourParis(new Date(cree.start_time)) === demainParis());

const { data: listeS } = await chargerDevoirs(sophie, lina);
verifier('Sophie retrouve le devoir dans la vue « Devoirs »', (listeS ?? []).some((d) => d.id === cree.id && !d.is_done));

// Marc coche : le serveur pose l'auteur et l'heure.
const { data: coche, error: eCoche } = await cocher(marc, cree.id, true);
verifier('Marc coche (même foyer)', !eCoche && coche?.is_done === true, eCoche?.message);
verifier('fait_par = Marc, fait_le posé par le serveur', coche?.fait_par === idMarc && !!coche?.fait_le);

// Sophie lit « Coché par Marc ».
const { data: vus } = await chargerDevoirs(sophie, lina);
const vu = (vus ?? []).find((d) => d.id === cree.id);
const { data: resp } = await sophie.rpc('responsables_enfant', { p_child_id: lina });
const prenomAuteur = (resp ?? []).find((r) => r.user_id === vu?.fait_par)?.prenom;
verifier('Sophie voit la coche de Marc avec son prénom', vu?.is_done && prenomAuteur === 'Marc', `${vu?.fait_par} / ${prenomAuteur}`);

// Falsification : Sophie change le titre et tente de s'attribuer la coche.
const { data: falsifie } = await sophie.from('agenda_events')
  .update({ title: 'T4a Poésie (2 strophes)', fait_par: idSophie, fait_le: new Date(0).toISOString() }).eq('id', cree.id).select().single();
verifier('auteur et heure de la coche infalsifiables', falsifie?.fait_par === idMarc && falsifie?.fait_le === coche?.fait_le);
verifier('le titre, lui, est modifié', falsifie?.title === 'T4a Poésie (2 strophes)');

// Julien (autre foyer, même enfant) : garde partagée → voit la coche.
const { data: vusJ } = await chargerDevoirs(julien, lina);
verifier('Julien (garde partagée) voit le devoir coché par Marc', (vusJ ?? []).some((d) => d.id === cree.id && d.is_done && d.fait_par === idMarc));

// Karim (autre famille) : rien.
const { data: vusK } = await chargerDevoirs(karim, lina);
verifier('Karim ne voit aucun devoir de Lina', (vusK ?? []).length === 0, `${(vusK ?? []).length}`);
const { data: cocheK } = await karim.from('agenda_events').update({ is_done: false }).eq('id', cree.id).select();
verifier('Karim ne peut pas décocher', (cocheK ?? []).length === 0);

// Défaut du 20 nov. : l'Accueil et l'Agenda lisent la même donnée. L'Accueil lit la semaine (useAgendaSemaine :
// agenda_events, bornes des 7 jours de Paris) ; l'Agenda lit la vue « Devoirs » (chargerDevoirs). Une coche faite
// d'un côté se lit de l'autre.
const semaineAccueil = (c) => {
  const b = bornesParis(aujourdhuiParis(), decalerJour(aujourdhuiParis(), 7));
  return c.from('agenda_events').select('*').eq('child_id', lina).gte('start_time', b.debut).lte('start_time', b.fin).order('start_time');
};
await cocher(sophie, cree.id, false);
const { data: cocheAgenda } = await cocher(sophie, cree.id, true); // coche dans l'Agenda (vue « Devoirs »)
const { data: lueAccueil } = await semaineAccueil(sophie);
verifier('coche faite dans l’Agenda, lue par l’Accueil', (lueAccueil ?? []).some((e) => e.id === cree.id && e.is_done && e.fait_par === idSophie), cocheAgenda?.fait_par);
await cocher(marc, cree.id, false); // décoche depuis l'Accueil (même fonction cocherDevoir, compte de Marc)
const { data: lueAgenda } = await chargerDevoirs(sophie, lina);
verifier('décoche faite depuis l’Accueil, lue par l’Agenda', (lueAgenda ?? []).some((e) => e.id === cree.id && !e.is_done && e.fait_par === null));
await cocher(marc, cree.id, true);
const { data: lueAgenda2 } = await chargerDevoirs(sophie, lina);
verifier('coche faite depuis l’Accueil, lue par l’Agenda avec son auteur', (lueAgenda2 ?? []).some((e) => e.id === cree.id && e.is_done && e.fait_par === idMarc));

// Sophie décoche : auteur et heure vidés.
const { data: decoche } = await cocher(sophie, cree.id, false);
verifier('Sophie décoche : auteur et heure vidés', decoche?.is_done === false && decoche?.fait_par === null && decoche?.fait_le === null);

// Nettoyage.
const { error: eSuppr } = await sophie.from('agenda_events').delete().eq('id', cree.id);
verifier('nettoyage : devoir supprimé', !eSuppr, eSuppr?.message);

console.log(`\nLot 4a local : ${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
