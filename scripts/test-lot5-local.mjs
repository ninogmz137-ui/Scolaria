// Essai de M44 (lot 5) contre le Supabase LOCAL (jamais la production), sous RLS, avec le même appel que l'app
// (src/services/absenceService.signalerAbsence) :
//   - Lina (parent-3b, classe de enseignant-3b) : absence ACCEPTÉE ;
//   - un enfant créé par parent-3b sans classe : absence REFUSÉE par la base (« pas sur l'app »).
// Remise à zéro par le compte de service LOCAL (aucune règle de suppression pour un compte).
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot5-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { demainParis } from '../src/utils/jourParis.ts';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];

let ok = 0;
let echecs = 0;
const verifier = (nom, cond, detail = '') => {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  cond ? ok++ : echecs++;
};

const sophie = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
const { data: session, error: eConn } = await sophie.auth.signInWithPassword({ email: 'parent-3b@exemple.test', password: MDP });
if (eConn) throw new Error(`parent-3b : ${eConn.message}`);
const idSophie = session.user.id;
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: rs } = await sophie.from('responsables').select('child_id, children(first_name)').eq('user_id', idSophie);
const lina = rs.find((r) => r.children?.first_name === 'Lina')?.child_id ?? rs[0].child_id;

const signaler = (childId, prenom) =>
  sophie.from('absences').insert({
    student_id: childId, student_name: prenom, date_debut: demainParis(), date_fin: null, demi_journee: 'matin',
    motif: 'maladie', commentaire: null, statut: 'signalée', signalee_par: idSophie,
  }).select('id').single();

// 1. Lina : classe avec titulaire → acceptée.
await admin.from('absences').delete().eq('student_id', lina);
const { data: absLina, error: eLina } = await signaler(lina, 'Lina');
verifier('Lina (classe avec titulaire) : absence acceptée', !eLina && !!absLina, eLina?.message);

// 2. Enfant sans classe (créé pour l'essai) → refusée par la base.
const { data: cree, error: eCree } = await sophie.rpc('create_child', {
  p_first_name: 'Essai', p_last_name: 'SansClasse', p_age: 6, p_classe: 'CP',
});
const sansClasse = (Array.isArray(cree) ? cree[0] : cree)?.id;
verifier('enfant sans classe créé pour l’essai', !eCree && !!sansClasse, eCree?.message);
if (sansClasse) {
  const { data: absSans, error: eSans } = await signaler(sansClasse, 'Essai');
  verifier('enfant sans classe : absence refusée par la base', !absSans && !!eSans && /pas sur l'app/.test(eSans.message), eSans?.message ?? 'acceptée');
  const { count } = await admin.from('absences').select('id', { count: 'exact', head: true }).eq('student_id', sansClasse);
  verifier('enfant sans classe : aucune ligne enregistrée', count === 0, String(count));
}

// Nettoyage (compte de service LOCAL).
await admin.from('absences').delete().eq('student_id', lina);
if (sansClasse) {
  const { error: eSuppr } = await admin.from('children').delete().eq('id', sansClasse);
  verifier('nettoyage : enfant d’essai supprimé', !eSuppr, eSuppr?.message);
}

console.log(`\n${ok} OK, ${echecs} échec(s)`);
if (echecs) process.exit(1);
