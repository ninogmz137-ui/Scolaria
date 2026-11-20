// Essai de bout en bout du lot 4c (rendez-vous fixes, « À prévoir » par semaine) contre le Supabase LOCAL (jamais la
// production), avec les MÊMES requêtes et la MÊME logique d'affichage que l'app (services/rendezVousService,
// utils/rendezVous, utils/vacances, utils/devoirs.libelleCoche), sous RLS :
//   parent-3b (Sophie) et coparent-3b (Marc) : responsables de Lina, MÊME foyer ;
//   separe-3b (Julien) : responsable de Lina dans un AUTRE foyer ;
//   parent2-3b (Karim) : parent de Tom ; enseignant-3b : titulaire de la classe de Lina.
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot4c-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { aujourdhuiParis, decalerJour, lundiDuJour, jourParisIso, heureParisIso } from '../src/utils/jourParis.ts';
import { occurrencesSemaine, etatAPrevoir, ajoutePar } from '../src/utils/rendezVous.ts';
import { enVacances, zoneDepuisEcole } from '../src/utils/vacances.ts';
import { libelleCoche, auteursDepuisResponsables, auteurCoche } from '../src/utils/devoirs.ts';

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

// ─── Mêmes lectures que rendezVousService.chargerRendezVous ─────────────────────────────────────────────────
async function zoneEnfant(c, childId) {
  const { data: an } = await c.from('academic_years').select('classe_id').eq('student_id', childId).eq('statut', 'active').maybeSingle();
  if (!an?.classe_id) return 'B';
  const { data: cl } = await c.from('classes').select('ecole_id').eq('id', an.classe_id).maybeSingle();
  if (!cl?.ecole_id) return 'B';
  const { data: ec } = await c.from('ecoles').select('code_uai, ville').eq('id', cl.ecole_id).maybeSingle();
  return zoneDepuisEcole(ec);
}
async function vueAgenda(c, childId, lundi) {
  const { data: rdvs } = await c.from('rendez_vous_fixes').select('id, child_id, titre, jour_semaine, heure, categorie, a_prevoir, cree_par').eq('child_id', childId);
  const ids = (rdvs ?? []).map((r) => r.id);
  const [coches, auteurs, resp, zone] = await Promise.all([
    ids.length ? c.from('rendez_vous_coches').select('rdv_id, semaine, item').in('rdv_id', ids) : { data: [] },
    ids.length ? c.from('rendez_vous_coches_auteurs').select('rdv_id, semaine, item, fait_par, fait_le').in('rdv_id', ids) : { data: [] },
    c.rpc('responsables_enfant', { p_child_id: childId }),
    zoneEnfant(c, childId),
  ]);
  const noms = auteursDepuisResponsables(resp.data ?? []);
  const auj = aujourdhuiParis();
  return occurrencesSemaine(rdvs ?? [], lundi, (j) => enVacances(j, zone), decalerJour).map((o) => ({
    ...o,
    ajoutePar: ajoutePar(o.rdv.cree_par, noms),
    aPrevoir: etatAPrevoir(o.rdv, lundi, coches.data ?? [], auteurs.data ?? [], (id) => auteurCoche(id, noms), jourParisIso, heureParisIso,
      (x, a) => libelleCoche(x, a, auj, decalerJour(auj, -1))),
  }));
}

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc } = await connecter('coparent-3b@exemple.test');
const { c: julien } = await connecter('separe-3b@exemple.test');
const { c: karim } = await connecter('parent2-3b@exemple.test');
const { c: titulaire } = await connecter('enseignant-3b@exemple.test');
const { data: rs } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = rs[0].child_id;
await sophie.from('rendez_vous_fixes').delete().eq('child_id', lina);

// Semaine de classe de référence (zone B) : celle de la piscine, la prochaine semaine sans vacances.
let lundi = lundiDuJour(aujourdhuiParis());
while (enVacances(decalerJour(lundi, 3), 'B')) lundi = decalerJour(lundi, 7);

// 1. Sophie crée « Piscine · tous les jeudis » (via « Nouvel événement › Toutes les semaines »).
const { data: rdv, error: eRdv } = await sophie.from('rendez_vous_fixes')
  .insert({ child_id: lina, titre: 'Piscine', jour_semaine: 4, a_prevoir: ['Maillot', 'Bonnet', 'Serviette'] }).select('id').single();
verifier('Sophie crée « Piscine · tous les jeudis »', !eRdv && !!rdv, eRdv?.message);
verifier('zone de l’école de Lina (sans code UAI ni ville) : B par défaut', (await zoneEnfant(sophie, lina)) === 'B');
const vueS = await vueAgenda(sophie, lina, lundi);
verifier('la carte apparaît le jeudi de la semaine de classe', vueS.length === 1 && vueS[0].jour === decalerJour(lundi, 3), JSON.stringify(vueS.map((o) => o.jour)));
verifier('« Ajouté par vous » pour Sophie', vueS[0]?.ajoutePar === 'Ajouté par vous', vueS[0]?.ajoutePar);
verifier('« Ajouté par Sophie » pour Marc', (await vueAgenda(marc, lina, lundi))[0]?.ajoutePar === 'Ajouté par Sophie');
// Vacances : la Toussaint 2026 (zone B) ne montre rien.
verifier('aucune carte pendant les vacances (semaine du 19 oct. 2026)', (await vueAgenda(sophie, lina, '2026-10-19')).length === 0);

// 2. Tout responsable modifie (Julien, autre foyer, compris) ; l'auteur ne change pas.
const { data: modJ } = await julien.from('rendez_vous_fixes').update({ titre: 'Piscine (bassin 2)', a_prevoir: ['Maillot', 'Bonnet', 'Serviette', 'Gel douche'] }).eq('id', rdv.id).select('titre, cree_par');
verifier('Julien (autre foyer) modifie le rendez-vous', (modJ ?? [])[0]?.titre === 'Piscine (bassin 2)');
verifier('l’auteur reste Sophie', (modJ ?? [])[0]?.cree_par === idSophie);

// 3. « À prévoir » : Marc coche « Maillot » cette semaine ; partagé ; auteur dans le foyer seulement.
const { error: eC } = await marc.from('rendez_vous_coches').insert({ rdv_id: rdv.id, semaine: lundi, item: 'Maillot' });
verifier('Marc coche « Maillot » pour la semaine', !eC, eC?.message);
const maillot = (v) => v[0]?.aPrevoir.find((p) => p.item === 'Maillot');
const pourMarc = maillot(await vueAgenda(marc, lina, lundi));
const pourSophie = maillot(await vueAgenda(sophie, lina, lundi));
const pourJulien = maillot(await vueAgenda(julien, lina, lundi));
verifier('Marc : « Coché par vous · [heure] »', pourMarc?.coche && /^Coché par vous · /.test(pourMarc?.source ?? ''), pourMarc?.source);
verifier('Sophie (même foyer) : « Coché par Marc · [heure] »', pourSophie?.coche && /^Coché par Marc · /.test(pourSophie?.source ?? ''), pourSophie?.source);
verifier('Julien (autre foyer) : coché, « Fait », sans prénom ni heure', pourJulien?.coche && pourJulien?.source === 'Fait', pourJulien?.source);
const semaineSuivante = decalerJour(lundi, 7);
const prochaine = await vueAgenda(sophie, lina, semaineSuivante);
verifier('la semaine suivante repart décochée', prochaine.length === 0 || !maillot(prochaine)?.coche);
// Julien décoche (coche partagée).
await julien.from('rendez_vous_coches').delete().eq('rdv_id', rdv.id).eq('semaine', lundi).eq('item', 'Maillot');
verifier('Julien décoche : décoché pour Sophie aussi', !maillot(await vueAgenda(sophie, lina, lundi))?.coche);
const { error: eFalsif } = await sophie.from('rendez_vous_coches_auteurs').insert({ rdv_id: rdv.id, semaine: lundi, item: 'Bonnet', fait_par: idSophie });
verifier('écriture directe de l’auteur d’une coche refusée', !!eFalsif);

// 4. Autre famille, enseignant : rien.
verifier('Karim ne voit aucun rendez-vous de Lina', ((await karim.from('rendez_vous_fixes').select('id').eq('child_id', lina)).data ?? []).length === 0);
const { data: modK } = await karim.from('rendez_vous_fixes').update({ titre: 'piraté' }).eq('id', rdv.id).select('id');
verifier('Karim ne peut rien modifier', (modK ?? []).length === 0);
verifier('l’enseignant ne voit pas les rendez-vous de la famille', ((await titulaire.from('rendez_vous_fixes').select('id')).data ?? []).length === 0);

// 5. Marc supprime (tout responsable).
const { error: eSuppr } = await marc.from('rendez_vous_fixes').delete().eq('id', rdv.id);
verifier('Marc supprime le rendez-vous', !eSuppr && (await vueAgenda(sophie, lina, lundi)).length === 0, eSuppr?.message);

console.log(`\nLot 4c local : ${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
