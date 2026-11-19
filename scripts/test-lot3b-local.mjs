// Essai de bout en bout du lot 3b contre le Supabase LOCAL (jamais la production), avec les MÊMES appels que l'app
// (src/services/motsService.ts, src/services/liaisonService.ts), sous RLS, avec les comptes de scripts/seed-lot3b-local.mjs.
//   Parent : lit la question du mot, répond « peut-être » (la réponse vaut signature), lit le mot, répond en privé
//            en citant le mot (fil individuel créé au besoin), relit sa réponse.
//   Parent 2 (autre famille) : ne voit pas la réponse privée.
//   Enseignant : lit le compteur « ont lu » (1 sur 2) et la réponse privée qui cite son mot.
// Usage : node scripts/seed-lot3b-local.mjs && node scripts/test-lot3b-local.mjs   (puis relancer le seed pour repartir propre)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

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

// ─── Parent ────────────────────────────────────────────────────────────────
const { c: p, moi } = await connecter('parent-3b@exemple.test');
const { data: enfants } = await p.from('responsables').select('child_id').eq('user_id', moi);
const lina = enfants[0].child_id;
const { data: carnet, error: eCarnet } = await p
  .from('mot_carnets')
  .select('mots_liaison(id, titre, contenu, date_envoi, date_limite, statut, type, signature_mode, a_prevoir, created_at, teacher_id, question, question_libelle)')
  .eq('child_id', lina);
verifier('le parent lit les mots avec la question (M39)', !eCarnet && carnet?.length === 2, eCarnet?.message);
const sortie = carnet.map((x) => x.mots_liaison).find((m) => m.titre === 'Sortie à la ferme');
verifier('question et libellé lus', sortie?.question === true && sortie?.question_libelle === 'Lina viendra-t-elle à la sortie ?');
const { data: titulaire } = await p.rpc('est_titulaire_enfant', { p_child_id: lina, p_teacher_id: sortie.teacher_id });
verifier('l’auteur du mot est le titulaire (« Répondre à » proposé)', titulaire === true);

const { error: eRep } = await p
  .from('reponses_mot')
  .upsert({ mot_id: sortie.id, child_id: lina, participation: 'peut_etre' }, { onConflict: 'mot_id,child_id,responsable_id' });
verifier('réponse « peut-être » à la question d’un mot à signer', !eRep, eRep?.message);
const { error: eSig } = await p.from('signatures').insert({ mot_id: sortie.id, parent_id: moi, student_id: lina });
verifier('la signature suit la réponse', !eSig, eSig?.message);
const { error: eLu } = await p
  .from('read_receipts')
  .upsert({ mot_id: sortie.id, parent_id: moi, read_at: new Date().toISOString() }, { onConflict: 'mot_id,parent_id' });
verifier('mot marqué lu', !eLu, eLu?.message);

// Réponse privée : même séquence que repondreEnPrive.
const existant = await p.from('teacher_conversations').select('id').eq('teacher_id', sortie.teacher_id)
  .eq('student_id', lina).eq('portee', 'individuel').eq('parent_id', moi).maybeSingle();
verifier('recherche du fil individuel', !existant.error, existant.error?.message);
let filId = existant.data?.id;
if (!filId) {
  const cree = await p.from('teacher_conversations')
    .insert({ teacher_id: sortie.teacher_id, parent_id: moi, student_id: lina, portee: 'individuel' }).select('id').single();
  verifier('fil individuel créé par le parent', !cree.error, cree.error?.message);
  filId = cree.data?.id;
}
const { error: eMsg } = await p.from('teacher_messages')
  .insert({ conversation_id: filId, sender_role: 'parent', sender_id: moi, text: 'Nous vous confirmons jeudi.', mot_id: sortie.id });
verifier('réponse privée qui cite le mot', !eMsg, eMsg?.message);
const { data: mesRep, error: eMes } = await p.from('teacher_messages').select('mot_id, text, created_at')
  .eq('sender_id', moi).not('mot_id', 'is', null);
verifier('le parent relit sa réponse privée', !eMes && mesRep?.length === 1 && mesRep[0].mot_id === sortie.id, eMes?.message);
const { error: eSimple } = await p.from('teacher_messages')
  .insert({ conversation_id: filId, sender_role: 'parent', sender_id: moi, text: 'Message simple, sans mot cité.' });
verifier('message simple parent → enseignant (sans mot cité)', !eSimple, eSimple?.message);

// ─── Parent 2 (autre famille) ──────────────────────────────────────────────
const { c: p2 } = await connecter('parent2-3b@exemple.test');
const { data: vus2 } = await p2.from('teacher_messages').select('id');
verifier('l’autre famille ne voit aucune réponse privée', (vus2 ?? []).length === 0, `${vus2?.length} message(s)`);
const { data: lc2 } = await p2.rpc('lectures_mot', { p_mot_id: sortie.id });
verifier('un parent n’obtient pas le compteur', (lc2 ?? []).length === 0);

// ─── Enseignant ────────────────────────────────────────────────────────────
const { c: e, moi: eid } = await connecter('enseignant-3b@exemple.test');
const { data: sesMots, error: eMots } = await e.from('mots_liaison_enriched').select('*').eq('teacher_id', eid);
verifier('l’enseignant lit ses mots (vue enrichie)', !eMots && sesMots?.length === 2, eMots?.message);
const { data: lc, error: eLc } = await e.rpc('lectures_mot', { p_mot_id: sortie.id });
verifier('compteur « ont lu » : 1 sur 2', !eLc && lc?.[0]?.eleves_lus === 1 && lc?.[0]?.eleves_destinataires === 2, eLc?.message ?? JSON.stringify(lc));
const photo = sesMots.find((m) => m.titre === 'Photo de classe');
const { data: lcPhoto } = await e.rpc('lectures_mot', { p_mot_id: photo.id });
verifier('compteur d’un mot non lu : 0 sur 2', lcPhoto?.[0]?.eleves_lus === 0 && lcPhoto?.[0]?.eleves_destinataires === 2);
const { data: recus } = await e.from('teacher_messages').select('text, mot_id, sender_role').eq('conversation_id', filId);
verifier('l’enseignant reçoit la réponse privée et le mot cité', recus?.some((r) => r.mot_id === sortie.id && r.sender_role === 'parent'));

console.log(echecs === 0 ? `${ok} réussis, 0 échec(s)` : `${echecs} échec(s)`);
process.exitCode = echecs === 0 ? 0 : 1;
