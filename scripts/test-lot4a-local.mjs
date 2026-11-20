// Essai de bout en bout du lot 4a (devoirs, « Coché par ») contre le Supabase LOCAL (jamais la production), avec
// les MÊMES requêtes et la MÊME construction que l'app (devoirsService : agenda_events + coches_devoirs +
// responsables_enfant → utils/devoirs.construireDevoirs → libelleCoche), sous RLS, avec les comptes de
// scripts/seed-lot3b-local.mjs :
//   parent-3b (Sophie) et coparent-3b (Marc) : responsables de Lina, MÊME foyer ;
//   separe-3b (Julien) : responsable de Lina dans un AUTRE foyer (parent séparé) ;
//   parent2-3b (Karim) : parent de Tom → ne voit ni ne coche les devoirs de Lina.
// Règle des parents séparés (20 nov. 2026) : la coche est partagée entre TOUS les responsables ; l'auteur et
// l'heure ne sont visibles que dans le foyer de l'auteur ; hors foyer, la ligne vaut « Fait ».
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot4a-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import {
  aujourdhuiParis, demainParis, minuitParis, jourParis, bornesParis, decalerJour, jourParisIso, heureParisIso, heureParis,
} from '../src/utils/jourParis.ts';
import { construireDevoirs, auteursDepuisResponsables, auteurCoche, libelleCoche } from '../src/utils/devoirs.ts';

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

// ─── Les mêmes lectures que l'app ────────────────────────────────────────────────────────────────────────────
const AUJ = aujourdhuiParis();
const HIER = decalerJour(AUJ, -1);
async function lignesAvecCoches(c, childId, requete) {
  const [lignes, coches, resp] = await Promise.all([
    requete,
    c.rpc('coches_devoirs', { p_child_id: childId }),
    c.rpc('responsables_enfant', { p_child_id: childId }),
  ]);
  if (lignes.error || coches.error || resp.error) throw new Error(lignes.error?.message ?? coches.error?.message ?? resp.error?.message);
  const devoirs = construireDevoirs((lignes.data ?? []).filter((r) => r.event_type === 'devoir'), coches.data ?? [], jourParisIso, heureParisIso);
  const auteurs = auteursDepuisResponsables(resp.data ?? []);
  return new Map(devoirs.map((d) => [d.id, { ...d, ligne: libelleCoche(d, auteurCoche(d.faitPar, auteurs), AUJ, HIER) }]));
}
// Vue « Devoirs » de l'Agenda (devoirsService.chargerDevoirs).
const vueAgenda = (c, childId) => lignesAvecCoches(c, childId,
  c.from('agenda_events').select('*').eq('child_id', childId).eq('event_type', 'devoir')
    .gte('start_time', minuitParis(AUJ).toISOString()).order('start_time').limit(200));
// Accueil (useAgendaSemaine : la semaine de Paris).
const vueAccueil = (c, childId) => {
  const b = bornesParis(AUJ, decalerJour(AUJ, 7));
  return lignesAvecCoches(c, childId,
    c.from('agenda_events').select('*').eq('child_id', childId).gte('start_time', b.debut).lte('start_time', b.fin).order('start_time'));
};
// La seule fonction de coche de l'app (devoirsService.cocherDevoir → updateAgendaEvent).
const cocher = (c, id, fait) => c.from('agenda_events').update({ is_done: fait }).eq('id', id).select().single();
const heureDe = (ligne) => (ligne ?? '').match(/· (\d{1,2})h(\d{2})?$/);
const proche = (ligne) => {
  // « Coché par vous · 15h53 » : l'heure affichée est celle de maintenant (à une minute près).
  const m = heureDe(ligne);
  if (!m) return false;
  const [h, mn] = heureParis().split(':').map(Number);
  const affichee = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return Math.abs(h * 60 + mn - affichee) <= 1;
};

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc } = await connecter('coparent-3b@exemple.test');
const { c: julien } = await connecter('separe-3b@exemple.test');
const { c: karim } = await connecter('parent2-3b@exemple.test');
const { data: enfants } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = enfants[0].child_id;

// Sophie ajoute deux devoirs pour demain (8 h, heure de Paris).
const demain8h = new Date(minuitParis(demainParis()).getTime() + 8 * 3600000).toISOString();
const creer = (titre) => sophie.from('agenda_events')
  .insert({ child_id: lina, parent_id: idSophie, title: titre, event_type: 'devoir', start_time: demain8h }).select().single();
const { data: d1, error: e1 } = await creer('T4a Poésie');
const { data: d2 } = await creer('T4a Tables');
verifier('Sophie ajoute deux devoirs pour demain', !e1 && !!d1 && !!d2, e1?.message);
verifier('échéance = demain en heure de Paris', jourParis(new Date(d1.start_time)) === demainParis());

// 1. Coche depuis l'AGENDA (vue « Devoirs ») → la ligne vaut « Coché par vous · [heure] » pour Sophie, dans les deux vues.
await cocher(sophie, d1.id, true);
const agendaS = (await vueAgenda(sophie, lina)).get(d1.id);
const accueilS = (await vueAccueil(sophie, lina)).get(d1.id);
verifier('coche depuis l’Agenda → Agenda : « Coché par vous · [heure] »', /^Coché par vous · \d{1,2}h\d{0,2}$/.test(agendaS?.ligne ?? '') && proche(agendaS?.ligne), agendaS?.ligne);
verifier('coche depuis l’Agenda → Accueil : même ligne', accueilS?.ligne === agendaS?.ligne && accueilS?.fait, accueilS?.ligne);

// 2. Coche depuis l'ACCUEIL → même ligne dans les deux vues.
await cocher(sophie, d2.id, true);
const accueilS2 = (await vueAccueil(sophie, lina)).get(d2.id);
const agendaS2 = (await vueAgenda(sophie, lina)).get(d2.id);
verifier('coche depuis l’Accueil → Accueil : « Coché par vous · [heure] »', /^Coché par vous · /.test(accueilS2?.ligne ?? '') && proche(accueilS2?.ligne), accueilS2?.ligne);
verifier('coche depuis l’Accueil → Agenda : même ligne', agendaS2?.ligne === accueilS2?.ligne && agendaS2?.fait, agendaS2?.ligne);

// 3. Marc (même foyer que Sophie) voit l'auteur et l'heure.
const marcVue = (await vueAgenda(marc, lina)).get(d1.id);
verifier('Marc (même foyer) lit « Coché par Sophie · [heure] »', /^Coché par Sophie · /.test(marcVue?.ligne ?? ''), marcVue?.ligne);

// 4. Julien (autre foyer) voit la coche, sans prénom ni heure : « Fait ».
const julienVue = (await vueAgenda(julien, lina)).get(d1.id);
verifier('Julien (autre foyer) voit le devoir coché', julienVue?.fait === true);
verifier('Julien (autre foyer) : ni prénom ni heure, la ligne vaut « Fait »', julienVue?.ligne === 'Fait' && julienVue?.faitPar === null && julienVue?.faitHeure === null, JSON.stringify(julienVue));

// 5. Julien coche à son tour : lui voit « Coché par vous », Sophie et Marc (autre foyer pour lui) voient « Fait ».
await cocher(sophie, d2.id, false);
await cocher(julien, d2.id, true);
const julienVue2 = (await vueAgenda(julien, lina)).get(d2.id);
const sophieVue2 = (await vueAgenda(sophie, lina)).get(d2.id);
verifier('Julien, auteur, lit « Coché par vous »', /^Coché par vous · /.test(julienVue2?.ligne ?? ''), julienVue2?.ligne);
verifier('Sophie (autre foyer que Julien) lit « Fait »', sophieVue2?.ligne === 'Fait', sophieVue2?.ligne);

// 6. Falsification : écrire l'auteur directement est impossible.
const { error: eFalsif } = await sophie.from('agenda_coches').insert({ event_id: d2.id, fait_par: idSophie });
verifier('écriture directe de l’auteur refusée', !!eFalsif, 'insertion acceptée');
const { data: lecDirecte, error: eLec } = await sophie.from('agenda_coches').select('*');
verifier('lecture directe de agenda_coches refusée', !!eLec || (lecDirecte ?? []).length === 0, `${(lecDirecte ?? []).length} ligne(s)`);

// 7. Karim (autre famille) : rien.
const { data: vusK } = await karim.from('agenda_events').select('id').eq('child_id', lina);
const { data: cochesK } = await karim.rpc('coches_devoirs', { p_child_id: lina });
verifier('Karim ne voit ni devoir ni coche de Lina', (vusK ?? []).length === 0 && (cochesK ?? []).length === 0);
const { data: cocheK } = await karim.from('agenda_events').update({ is_done: false }).eq('id', d1.id).select();
verifier('Karim ne peut pas décocher', (cocheK ?? []).length === 0);

// 8. Décoche : plus de ligne.
await cocher(sophie, d1.id, false);
const apres = (await vueAgenda(sophie, lina)).get(d1.id);
verifier('Sophie décoche : plus de ligne source', apres?.fait === false && apres?.ligne === null, apres?.ligne);

// Nettoyage.
const { error: eSuppr } = await sophie.from('agenda_events').delete().in('id', [d1.id, d2.id]);
verifier('nettoyage : devoirs supprimés', !eSuppr, eSuppr?.message);

console.log(`\nLot 4a local : ${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
