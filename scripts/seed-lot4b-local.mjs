// Données de TEST du lot 4b (absences), base LOCALE seulement (jamais la production), APRÈS seed-lot3b-local.mjs :
//   · un second enseignant, enseignant2-4b (Paul Durand), titulaire d'une AUTRE classe (« CE2 lot 4b ») de la MÊME
//     école que la classe de Lina : il ne doit voir ni les absences de Lina ni leurs justificatifs ;
//   · une absence de Lina pour demain matin (rendez-vous), signalée par Sophie, SANS justificatif (« À justifier »).
// Ne recrée pas les comptes du lot 3b (une session ouverte sur le Redmi reste valide).
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot4b-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { demainParis } from '../src/utils/jourParis.ts';

const statut = JSON.parse(execSync('npx supabase@3.2.0 status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MDP = readFileSync(new URL('./seed-lot3b-local.mjs', import.meta.url), 'utf8').match(/const MDP = '([^']+)'/)[1];
const EMAIL_T2 = 'enseignant2-4b@exemple.test';
const echoue = (quoi, e) => {
  if (e) throw new Error(`${quoi} : ${e.message}`);
};

// 1. Second enseignant (recréé), même école que « CE1 lot 3b ».
const { data: existants } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of existants?.users ?? []) if (u.email === EMAIL_T2) await admin.auth.admin.deleteUser(u.id);
await admin.from('classes').delete().eq('nom', 'CE2 lot 4b');
const { data: t2, error: eT2 } = await admin.auth.admin.createUser({
  email: EMAIL_T2, password: MDP, email_confirm: true, user_metadata: { first_name: 'Paul', family_name: 'Durand' },
});
echoue('compte enseignant2-4b', eT2);
echoue('rôle enseignant2-4b', (await admin.from('profiles').update({ role: 'enseignant', first_name: 'Paul', family_name: 'Durand' }).eq('id', t2.user.id)).error);
const { data: ce1, error: eCe1 } = await admin.from('classes').select('ecole_id').eq('nom', 'CE1 lot 3b').not('enseignant_id', 'is', null).single();
echoue('classe CE1 lot 3b (lancer seed-lot3b-local.mjs d’abord)', eCe1);
echoue('classe CE2 lot 4b', (await admin.from('classes').insert({
  ecole_id: ce1.ecole_id, annee_scolaire: '2026-2027', niveau: 'CE2', nom: 'CE2 lot 4b', enseignant_id: t2.user.id,
})).error);

// 2. Absence de Lina pour demain matin, signalée par Sophie sous RLS, sans justificatif.
const sophie = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
const { data: s, error: eS } = await sophie.auth.signInWithPassword({ email: 'parent-3b@exemple.test', password: MDP });
echoue('connexion parent-3b', eS);
const { data: r } = await sophie.from('responsables').select('child_id').eq('user_id', s.user.id);
const lina = r[0].child_id;
await admin.from('absences').delete().eq('student_id', lina); // aucun compte ne supprime une absence : compte de service local
echoue('absence de Lina', (await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: demainParis(), demi_journee: 'matin', motif: 'rendez_vous',
  commentaire: 'Rendez-vous chez l’orthophoniste.', signalee_par: s.user.id,
})).error);

console.log(`Données lot 4b prêtes : ${EMAIL_T2} (autre classe, même école) ; absence de Lina demain matin (rendez-vous), à justifier.`);
