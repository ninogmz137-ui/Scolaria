// Essai de bout en bout de M45 (annuler une absence, lot 6) contre le Supabase LOCAL (jamais la production), sous RLS,
// avec les MÊMES appels que l'app (src/services/absenceService.annulerAbsence) :
//   parent-3b (Sophie, auteur) et coparent-3b (Marc) : même foyer ; separe-3b (Julien) : autre foyer ;
//   enseignant-3b (Claire Martin) : titulaire de la classe de Lina.
// Remise à zéro par le compte de service LOCAL (aucune règle de suppression des absences pour un compte).
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot6-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { decalerJour, aujourdhuiParis } from '../src/utils/jourParis.ts';

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
const annuler = (c, id) => c.from('absences').update({ statut: 'annulée' }).eq('id', id).select('id');

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc } = await connecter('coparent-3b@exemple.test');
const { c: julien } = await connecter('separe-3b@exemple.test');
const { c: titulaire } = await connecter('enseignant-3b@exemple.test');
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rs } = await sophie.from('responsables').select('child_id, children(first_name)').eq('user_id', idSophie);
const lina = rs.find((r) => r.children?.first_name === 'Lina')?.child_id;
await admin.from('absences').delete().eq('student_id', lina);

// Sophie signale une absence pour demain, avec justificatif.
const demain = decalerJour(aujourdhuiParis(), 1);
const { data: abs, error: eAbs } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: demain, demi_journee: 'journee', motif: 'maladie', statut: 'signalée', signalee_par: idSophie,
}).select('id').single();
verifier('Sophie signale une absence pour demain', !eAbs && !!abs, eAbs?.message);
const { data: an } = await sophie.from('academic_years').select('id').eq('student_id', lina).eq('statut', 'active').maybeSingle();
const chemin = `${lina}/${an?.id}/${randomUUID()}.pdf`;
await sophie.storage.from('carnet').upload(chemin, new TextEncoder().encode('%PDF-1.4\n%%EOF\n'), { contentType: 'application/pdf' });
const { error: eJ } = await sophie.from('absences_justificatifs').insert({ absence_id: abs.id, chemin, depose_par: idSophie });
verifier('justificatif joint', !eJ, eJ?.message);

// Julien (autre foyer) : refusé (aucune ligne).
const { data: rJ } = await annuler(julien, abs.id);
verifier('Julien (autre foyer) ne peut pas annuler', (rJ ?? []).length === 0);

// Marc (même foyer) : annule ; la base pose l'auteur et retire le justificatif.
const { data: rM, error: eM } = await annuler(marc, abs.id);
verifier('Marc (même foyer) annule', !eM && (rM ?? []).length === 1, eM?.message);
const { data: ligne } = await admin.from('absences').select('statut, annulee_le, annulee_par').eq('id', abs.id).single();
verifier('statut « annulée », date et auteur posés par la base', ligne?.statut === 'annulée' && !!ligne?.annulee_le && !!ligne?.annulee_par, JSON.stringify(ligne));
const { count: nJ } = await admin.from('absences_justificatifs').select('absence_id', { count: 'exact', head: true }).eq('absence_id', abs.id);
verifier('ligne du justificatif retirée', nJ === 0, String(nJ));
// L'app supprime le fichier quand ce compte en est le dépôt (ici Sophie).
const { error: eRm } = await sophie.storage.from('carnet').remove([chemin]);
const { data: reste } = await admin.storage.from('carnet').list(`${lina}/${an?.id}`, { search: chemin.split('/').pop() });
verifier('fichier du justificatif supprimé par son déposant', !eRm && (reste ?? []).length === 0, eRm?.message);

// Côté parent : l'absence n'est plus lue comme active (même filtre que chargerAbsences).
const { data: lues } = await sophie.from('absences').select('id, statut').eq('student_id', lina);
verifier('parent : absence annulée écartée par le filtre de l’app', (lues ?? []).filter((a) => a.statut !== 'annulée').every((a) => a.id !== abs.id));
// Le titulaire lit « annulée ».
const { data: vueT } = await titulaire.from('absences').select('statut').eq('id', abs.id);
verifier('titulaire : lit « annulée » (Annulée par la famille)', vueT?.[0]?.statut === 'annulée', JSON.stringify(vueT));

// Absence commencée (hier) : refusée avec le message que l'app traduit.
const { data: hier } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: decalerJour(aujourdhuiParis(), -1), demi_journee: 'journee', motif: 'autre', statut: 'signalée', signalee_par: idSophie,
}).select('id').single();
const { error: eH } = await annuler(sophie, hier.id);
verifier('absence commencée : annulation refusée (« commencée »)', !!eH && /commencée/.test(eH.message), eH?.message ?? 'acceptée');

await admin.from('absences').delete().eq('student_id', lina);
console.log(`\n${ok} OK, ${echecs} échec(s)`);
if (echecs) process.exit(1);
