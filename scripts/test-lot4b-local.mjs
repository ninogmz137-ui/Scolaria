// Essai de bout en bout du lot 4b (absence signalée, justificatif privé) contre le Supabase LOCAL (jamais la
// production), avec les MÊMES appels que l'app (src/services/absenceService.ts) et l'API Storage réelle, sous RLS :
//   parent-3b (Sophie), coparent-3b (Marc, même foyer), separe-3b (Julien, autre foyer) : responsables de Lina ;
//   parent2-3b (Karim) : parent de Tom, MÊME classe que Lina ;
//   enseignant-3b (Claire Martin) : titulaire de la classe de Lina ;
//   enseignant2-4b (Paul Durand) : titulaire d'une AUTRE classe de la MÊME école.
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot4b-local.mjs
//         && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot4b-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { demainParis, decalerJour, aujourdhuiParis } from '../src/utils/jourParis.ts';
import { aJustifier, couvreJour } from '../src/utils/absences.ts';

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
const PDF = new TextEncoder().encode('%PDF-1.4\n% justificatif de test lot 4b\n%%EOF\n');
const COLONNES = 'id, student_id, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, justificatif_path, created_at';

// Mêmes appels que absenceService.
async function anneeActive(c, childId) {
  const { data } = await c.from('academic_years').select('id').eq('student_id', childId).eq('statut', 'active').maybeSingle();
  return data?.id;
}
async function deposer(c, childId) {
  const chemin = `${childId}/${await anneeActive(c, childId)}/${randomUUID()}.pdf`;
  const { error } = await c.storage.from('carnet').upload(chemin, PDF, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`dépôt : ${error.message}`);
  return chemin;
}
async function lireJustificatif(c, chemin) {
  const { data, error } = await c.storage.from('carnet').createSignedUrl(chemin, 3600);
  if (error || !data?.signedUrl) return { lu: false, raison: error?.message ?? 'pas d’URL' };
  const r = await fetch(data.signedUrl);
  const octets = new Uint8Array(await r.arrayBuffer());
  return { lu: r.ok && octets.length === PDF.length, raison: `HTTP ${r.status}` };
}

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc, moi: idMarc } = await connecter('coparent-3b@exemple.test');
const { c: julien } = await connecter('separe-3b@exemple.test');
const { c: karim, moi: idKarim } = await connecter('parent2-3b@exemple.test');
const { c: titulaire } = await connecter('enseignant-3b@exemple.test');
const { c: autreEnseignant } = await connecter('enseignant2-4b@exemple.test');
const { data: rs } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = rs[0].child_id;
const { data: rk } = await karim.from('responsables').select('child_id').eq('user_id', idKarim);
const tom = rk[0].child_id;
// Aucune règle de suppression des absences pour un compte (un parent ne supprime pas une absence signalée) :
// la remise à zéro du test passe par le compte de service de la base LOCALE.
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await admin.from('absences').delete().eq('student_id', lina);
const { data: supprSophie } = await sophie.from('absences').delete().eq('student_id', lina).select('id');
verifier('un parent ne peut pas supprimer une absence (aucune règle de suppression)', (supprSophie ?? []).length === 0);

// 1. Sophie signale une absence (rendez-vous, plusieurs jours) avec justificatif.
const debut = demainParis();
const fin = decalerJour(debut, 2);
const chemin = await deposer(sophie, lina);
const { data: abs, error: eAbs } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: debut, date_fin: fin, demi_journee: 'journee', motif: 'rendez_vous',
  commentaire: null, statut: 'signalée', signalee_par: idSophie, justificatif_path: chemin,
}).select(COLONNES).single();
verifier('Sophie signale une absence « rendez-vous » avec justificatif', !eAbs && !!abs, eAbs?.message);
verifier('l’absence couvre ses trois jours', couvreJour(abs, debut) && couvreJour(abs, fin) && !couvreJour(abs, decalerJour(fin, 1)));

// 2. Lecture de l'absence et du justificatif.
const voit = async (c) => ((await c.from('absences').select('id').eq('id', abs.id)).data ?? []).length === 1;
verifier('Sophie (auteur) lit le justificatif', (await lireJustificatif(sophie, chemin)).lu);
verifier('Marc (même foyer) voit l’absence et lit le justificatif', (await voit(marc)) && (await lireJustificatif(marc, chemin)).lu);
verifier('Julien (responsable, autre foyer) voit l’absence et lit le justificatif', (await voit(julien)) && (await lireJustificatif(julien, chemin)).lu);
const lecT = await lireJustificatif(titulaire, chemin);
verifier('le titulaire de la classe voit l’absence (avant l’appel)', await voit(titulaire));
verifier('le titulaire lit le justificatif (URL signée, fichier téléchargé)', lecT.lu, lecT.raison);
const lecT2 = await lireJustificatif(autreEnseignant, chemin);
verifier('autre enseignant de l’école : absence invisible', !(await voit(autreEnseignant)));
verifier('autre enseignant de l’école : justificatif REFUSÉ', !lecT2.lu, lecT2.raison);
const lecK = await lireJustificatif(karim, chemin);
verifier('parent d’un autre enfant (même classe) : absence invisible', !(await voit(karim)));
verifier('parent d’un autre enfant : justificatif REFUSÉ', !lecK.lu, lecK.raison);

// 3. L'enseignant ne modifie rien (aucun statut « vu » en V1).
const { data: modT } = await titulaire.from('absences').update({ statut: 'prise_en_compte' }).eq('id', abs.id).select('id');
verifier('le titulaire ne peut rien modifier', (modT ?? []).length === 0);

// 4. Motifs.
const { error: eVac } = await sophie.from('absences').insert({ student_id: lina, motif: 'vacances', signalee_par: idSophie });
verifier('motif hors liste refusé', !!eVac);

// 5. Justificatifs falsifiés.
const cheminTom = await deposer(karim, tom);
const { error: eTom } = await sophie.from('absences').insert({ student_id: lina, motif: 'maladie', signalee_par: idSophie, justificatif_path: cheminTom });
verifier('le fichier d’un autre enfant ne peut pas servir de justificatif', !!eTom);
const cheminMarc = await deposer(marc, lina);
const { error: eMarc } = await sophie.from('absences').insert({ student_id: lina, motif: 'maladie', signalee_par: idSophie, justificatif_path: cheminMarc });
verifier('un fichier déposé par un autre compte ne peut pas servir de justificatif', !!eMarc);

// 6. « À justifier » : absence sans justificatif, puis justificatif ajouté par l'auteur seul.
const { data: sans } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: aujourdhuiParis(), demi_journee: 'matin', motif: 'maladie', signalee_par: idSophie,
}).select(COLONNES).single();
const { data: toutes } = await sophie.from('absences').select(COLONNES).eq('student_id', lina);
const aj = aJustifier(toutes ?? [], idSophie, decalerJour(aujourdhuiParis(), -30));
verifier('« À justifier » : l’absence sans justificatif, et seulement elle', aj.length === 1 && aj[0].id === sans.id, JSON.stringify(aj.map((a) => a.id)));
verifier('« À justifier » n’apparaît pas pour Marc (il n’en est pas l’auteur)', aJustifier(toutes ?? [], idMarc, decalerJour(aujourdhuiParis(), -30)).length === 0);
const cheminMarc2 = await deposer(marc, lina);
const { data: parMarc } = await marc.from('absences').update({ justificatif_path: cheminMarc2 }).eq('id', sans.id).select('id');
verifier('Marc ne peut pas justifier l’absence signalée par Sophie', (parMarc ?? []).length === 0);
const chemin2 = await deposer(sophie, lina);
const { data: parSophie, error: eJ } = await sophie.from('absences').update({ justificatif_path: chemin2 }).eq('id', sans.id).select('id');
verifier('Sophie ajoute le justificatif ensuite', !eJ && (parSophie ?? []).length === 1, eJ?.message);
verifier('…et le titulaire le lit', (await lireJustificatif(titulaire, chemin2)).lu);

// Nettoyage.
await admin.from('absences').delete().eq('student_id', lina);
await sophie.storage.from('carnet').remove([chemin, chemin2]);
await marc.storage.from('carnet').remove([cheminMarc, cheminMarc2]);
await karim.storage.from('carnet').remove([cheminTom]);

console.log(`\nLot 4b local : ${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
