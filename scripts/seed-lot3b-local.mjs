// Données de TEST du lot 3b pour le Redmi branché sur le Supabase LOCAL (jamais la production) :
//   · un compte enseignant (titulaire de la classe « CE1 lot 3b ») ;
//   · deux comptes parents, chacun avec un enfant dans cette classe (Lina, Tom) ;
//   · deux mots envoyés à la classe : « Sortie à la ferme » (une signature suffit + question avec libellé),
//     « Photo de classe » (information, sans question).
// Mot de passe de test commun : MDP ci-dessous (valeur factice, base locale uniquement).
// Usage : node scripts/seed-lot3b-local.mjs   (idempotent : recrée les comptes ; les données liées partent en cascade)
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MDP = 'Lot3b-test-2026!';
const COMPTES = {
  enseignant: { email: 'enseignant-3b@exemple.test', nom: 'Martin', prenom: 'Claire' },
  parent: { email: 'parent-3b@exemple.test', nom: 'Bernard', prenom: 'Sophie' },
  parent2: { email: 'parent2-3b@exemple.test', nom: 'Leroy', prenom: 'Karim' },
};

const echoue = (quoi, e) => {
  if (e) throw new Error(`${quoi} : ${e.message}`);
};

// 1. Comptes (recréés).
const { data: existants } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of existants?.users ?? []) {
  if (Object.values(COMPTES).some((c) => c.email === u.email)) await admin.auth.admin.deleteUser(u.id);
}
await admin.from('classes').delete().eq('nom', 'CE1 lot 3b');
const ids = {};
for (const [cle, c] of Object.entries(COMPTES)) {
  const { data, error } = await admin.auth.admin.createUser({
    email: c.email,
    password: MDP,
    email_confirm: true,
    user_metadata: { family_name: c.nom, given_name: c.prenom },
  });
  echoue(`compte ${cle}`, error);
  ids[cle] = data.user.id;
}
const { error: eRole } = await admin
  .from('profiles')
  .update({ role: 'enseignant', first_name: COMPTES.enseignant.prenom, family_name: COMPTES.enseignant.nom })
  .eq('id', ids.enseignant);
echoue('rôle enseignant', eRole);

// 2. École et classe, titulaire = l'enseignant.
const { data: ecole, error: eEcole } = await admin.from('ecoles').insert({ nom: 'École lot 3b' }).select('id').single();
echoue('école', eEcole);
const { data: classe, error: eClasse } = await admin
  .from('classes')
  .insert({ ecole_id: ecole.id, annee_scolaire: '2026-2027', niveau: 'CE1', nom: 'CE1 lot 3b', enseignant_id: ids.enseignant })
  .select('id')
  .single();
echoue('classe', eClasse);

// 3. Enfants créés par leurs parents (create_child, sous RLS), puis rattachés à la classe.
async function enfant(cleParent, prenom, couleur) {
  const client = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: COMPTES[cleParent].email, password: MDP });
  echoue(`connexion ${cleParent}`, error);
  const { data, error: e2 } = await client.rpc('create_child', {
    p_first_name: prenom, p_last_name: COMPTES[cleParent].nom, p_birth_date: null, p_age: 7,
    p_classe: 'CE1', p_school: 'École lot 3b', p_color: couleur,
  });
  echoue(`enfant ${prenom}`, e2);
  const id = data?.id ?? data?.[0]?.id;
  const { error: e3 } = await admin.from('academic_years').update({ classe_id: classe.id }).eq('student_id', id);
  echoue(`rattachement ${prenom}`, e3);
  return id;
}
const lina = await enfant('parent', 'Lina', '#0369A1');
await enfant('parent2', 'Tom', '#BE185D');

// 4. Mots envoyés à la classe (distribution automatique dans chaque carnet).
const mots = [
  {
    titre: 'Sortie à la ferme', type: 'signature', signature_mode: 'one', question: true,
    question_libelle: 'Lina viendra-t-elle à la sortie ?',
    contenu: 'Chers parents,\n\nNous irons à la ferme pédagogique jeudi. Merci de signer et de nous dire si votre enfant viendra.\n\nMme Martin',
    a_prevoir: ['Bottes', 'Pique-nique'],
  },
  {
    titre: 'Photo de classe', type: 'information', signature_mode: 'none', question: false, question_libelle: null,
    contenu: 'Chers parents,\n\nLa photo de classe aura lieu vendredi matin.\n\nMme Martin', a_prevoir: [],
  },
];
for (const m of mots) {
  const { error } = await admin.from('mots_liaison').insert({
    ...m, teacher_id: ids.enseignant, classe_id: classe.id, classe: 'CE1 lot 3b', statut: 'envoyé',
    date_envoi: new Date().toISOString().slice(0, 10),
  });
  echoue(`mot ${m.titre}`, error);
}
const { count } = await admin.from('mot_carnets').select('*', { count: 'exact', head: true }).eq('child_id', lina);
console.log(`Données lot 3b prêtes : enseignant, 2 parents, Lina et Tom en CE1 lot 3b, ${count} mot(s) dans le carnet de Lina.`);
console.log(`Comptes : ${Object.values(COMPTES).map((c) => c.email).join(', ')} (mot de passe : constante MDP de ce fichier).`);
