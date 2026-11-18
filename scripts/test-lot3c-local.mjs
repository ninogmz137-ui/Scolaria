// Essai de bout en bout du lot 3c contre le Supabase LOCAL (jamais la production), avec les MÊMES appels que l'app
// (src/services/filsService.ts), sous RLS, avec les comptes de scripts/seed-lot3b-local.mjs :
//   parent-3b (Sophie) et coparent-3b (Marc) : même foyer que Lina → un seul fil « foyer » avec l'enseignante, partagé ;
//   separe-3b (Julien) : responsable de Lina dans un AUTRE foyer → ne voit rien de ce fil, a le sien ;
//   parent2-3b (Karim) : parent de Tom → ne voit rien ;
//   enseignant-3b (Claire Martin) : reçoit, lit les libellés (prénom de l'enfant, famille), répond.
//   Fil de classe : `class_posts`, lu par les responsables, aucune écriture parent (annonce seule).
// Usage : node scripts/seed-lot3b-local.mjs && node scripts/test-lot3c-local.mjs   (puis relancer le seed pour repartir propre)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
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

// Même séquence que filEnseignantReel (filsService) : classe active → titulaire ; mon foyer ; fil foyer trouvé ou créé.
async function filEnseignant(c, moi, childId) {
  const { data: annee } = await c.from('academic_years').select('classe_id').eq('student_id', childId).eq('statut', 'active').maybeSingle();
  const { data: classe } = await c.from('classes').select('id, nom, enseignant_id').eq('id', annee?.classe_id).maybeSingle();
  const { data: r } = await c.from('responsables').select('foyer_id').eq('child_id', childId).eq('user_id', moi).maybeSingle();
  const chercher = () =>
    c.from('teacher_conversations').select('id').eq('teacher_id', classe.enseignant_id).eq('student_id', childId)
      .eq('portee', 'foyer').eq('foyer_id', r.foyer_id).maybeSingle();
  let { data: fil } = await chercher();
  let cree = false;
  if (!fil) {
    const { data: enfant } = await c.from('children').select('first_name, last_name').eq('id', childId).maybeSingle();
    const { error } = await c.from('teacher_conversations').insert({
      teacher_id: classe.enseignant_id, student_id: childId, portee: 'foyer', foyer_id: r.foyer_id,
      student_code: enfant?.first_name ?? '', parent_name: enfant?.last_name ? `Famille ${enfant.last_name}` : 'Famille',
    });
    if (error && error.code !== '23505') throw new Error(error.message);
    ({ data: fil } = await chercher());
    cree = true;
  }
  return { id: fil?.id, cree, classe };
}
const envoyer = (c, moi, filId, text) =>
  c.from('teacher_messages').insert({ conversation_id: filId, sender_role: 'parent', sender_id: moi, text });

// ─── Sophie (parent-3b) : « Écrire à l'enseignant » ouvre le fil foyer, créé au besoin ───────────────────────
const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { data: enfants } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = enfants[0].child_id;
const filS = await filEnseignant(sophie, idSophie, lina);
verifier('Sophie : fil foyer avec l’enseignante créé', !!filS.id && filS.cree);
const { data: nom } = await sophie.rpc('fil_enseignant', { p_conversation_id: filS.id });
verifier('nom de l’enseignante lu pour le fil', nom === 'Claire Martin', String(nom));
const e1 = await envoyer(sophie, idSophie, filS.id, 'T3c message libre de Sophie');
verifier('Sophie envoie un message libre (sans mot cité)', !e1.error, e1.error?.message);

// ─── Marc (coparent-3b, même foyer) : même fil, voit et écrit ────────────────────────────────────────────────
const { c: marc, moi: idMarc } = await connecter('coparent-3b@exemple.test');
const filM = await filEnseignant(marc, idMarc, lina);
verifier('Marc (même foyer) retrouve LE MÊME fil, sans en créer un autre', filM.id === filS.id && !filM.cree);
const { data: vusMarc } = await marc.from('teacher_messages').select('text').eq('conversation_id', filS.id);
verifier('Marc lit le message de Sophie', (vusMarc ?? []).some((m) => m.text === 'T3c message libre de Sophie'));
const e2 = await envoyer(marc, idMarc, filS.id, 'T3c message de Marc');
verifier('Marc écrit dans le fil du foyer', !e2.error, e2.error?.message);
const doublon = await marc.from('teacher_conversations').insert({
  teacher_id: filS.classe.enseignant_id, student_id: lina, portee: 'foyer',
  foyer_id: (await marc.from('responsables').select('foyer_id').eq('child_id', lina).eq('user_id', idMarc).single()).data.foyer_id,
});
verifier('un second fil foyer est refusé (unique)', doublon.error?.code === '23505', doublon.error?.message);

// ─── Julien (separe-3b, autre foyer) : rien de ce fil ; le sien à part ──────────────────────────────────────
const { c: julien, moi: idJulien } = await connecter('separe-3b@exemple.test');
const { data: filsJulien } = await julien.from('teacher_conversations').select('id').eq('student_id', lina);
verifier('Julien (parent séparé) ne voit pas le fil du foyer de Sophie', !(filsJulien ?? []).some((f) => f.id === filS.id));
const { data: msgsJulien } = await julien.from('teacher_messages').select('id').eq('conversation_id', filS.id);
verifier('Julien ne lit aucun message de ce fil', (msgsJulien ?? []).length === 0);
const e3 = await envoyer(julien, idJulien, filS.id, 'T3c intrus');
verifier('Julien ne peut pas écrire dans ce fil', !!e3.error);
const filJ = await filEnseignant(julien, idJulien, lina);
verifier('Julien a son propre fil avec l’enseignante', !!filJ.id && filJ.id !== filS.id && filJ.cree);
const e4 = await envoyer(julien, idJulien, filJ.id, 'T3c message de Julien');
verifier('Julien écrit dans son fil', !e4.error, e4.error?.message);
const { data: vusSophie } = await sophie.from('teacher_messages').select('text').eq('conversation_id', filJ.id);
verifier('Sophie ne lit pas le fil de Julien', (vusSophie ?? []).length === 0);

// ─── Karim (parent2-3b, parent de Tom) : rien ──────────────────────────────────────────────────────────────
const { c: karim } = await connecter('parent2-3b@exemple.test');
const { data: filsKarim } = await karim.from('teacher_conversations').select('id').in('id', [filS.id, filJ.id]);
verifier('Karim (autre famille) ne voit aucun des deux fils', (filsKarim ?? []).length === 0);

// ─── Enseignante : reçoit, lit les libellés, répond ────────────────────────────────────────────────────────
const { c: ens, moi: idEns } = await connecter('enseignant-3b@exemple.test');
const { data: filsEns } = await ens.from('teacher_conversations').select('id, student_code, parent_name').eq('teacher_id', idEns);
const vuS = (filsEns ?? []).find((f) => f.id === filS.id);
verifier('l’enseignante voit le fil, libellé « Lina · Famille Bernard »', vuS?.student_code === 'Lina' && vuS?.parent_name === 'Famille Bernard', JSON.stringify(vuS));
verifier('l’enseignante voit aussi le fil de Julien (séparé)', (filsEns ?? []).some((f) => f.id === filJ.id));
const { data: recus } = await ens.from('teacher_messages').select('text, sender_role, read').eq('conversation_id', filS.id).order('created_at');
verifier('l’enseignante reçoit les 2 messages du foyer', (recus ?? []).filter((m) => m.sender_role === 'parent').length === 2, JSON.stringify(recus));
const e5 = await ens.from('teacher_messages').insert({ conversation_id: filS.id, sender_role: 'teacher', sender_id: idEns, text: 'T3c réponse de l’enseignante', read: true });
verifier('l’enseignante répond', !e5.error, e5.error?.message);
const e6 = await ens.from('teacher_messages').update({ read: true }).eq('conversation_id', filS.id).eq('sender_role', 'parent').eq('read', false);
verifier('l’enseignante marque lus les messages des parents', !e6.error, e6.error?.message);

// ─── Retour chez le foyer : réponse lue par les deux ; « lu » ───────────────────────────────────────────────
const { data: rep } = await marc.from('teacher_messages').select('id, read').eq('conversation_id', filS.id).eq('sender_role', 'teacher');
verifier('Marc lit la réponse de l’enseignante', (rep ?? []).length === 1);
const e7 = await sophie.from('teacher_messages').update({ read: true }).eq('conversation_id', filS.id).eq('sender_role', 'teacher').eq('read', false);
verifier('Sophie marque lue la réponse (ouverture du fil)', !e7.error, e7.error?.message);
const e8 = await sophie.from('teacher_messages').update({ text: 'réécrit' }).eq('conversation_id', filS.id).eq('sender_role', 'teacher').select('id');
verifier('un message ne peut pas être réécrit', !!e8.error || (e8.data ?? []).length === 0, e8.error?.message);

// ─── Fil de classe : annonces lisibles, aucune écriture parent ──────────────────────────────────────────────
const { data: annonces } = await sophie.from('class_posts').select('title, content').eq('classe_id', filS.classe.id);
verifier('Sophie lit les 2 annonces de classe', (annonces ?? []).length === 2, JSON.stringify(annonces));
const { data: annoncesJ } = await julien.from('class_posts').select('id').eq('classe_id', filS.classe.id);
verifier('Julien (séparé) lit aussi les annonces de la classe de Lina', (annoncesJ ?? []).length === 2);
const e9 = await sophie.from('class_posts').insert({ teacher_id: idSophie, classe_id: filS.classe.id, type: 'annonce', title: 'x', content: 'x' });
verifier('un parent ne peut pas publier dans le fil de classe', !!e9.error);
const e10 = await sophie.from('class_posts').insert({ teacher_id: idEns, classe_id: filS.classe.id, type: 'annonce', title: 'x', content: 'x' });
verifier('ni au nom de l’enseignante', !!e10.error);
const { data: annoncesK } = await karim.from('class_posts').select('id').eq('classe_id', filS.classe.id);
verifier('Karim (Tom, même classe) lit les annonces', (annoncesK ?? []).length === 2);

console.log(`\n${ok} OK, ${echecs} échec(s)`);
process.exitCode = echecs ? 1 : 0;
