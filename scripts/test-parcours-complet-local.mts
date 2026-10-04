// PARCOURS COMPLET sur le Supabase LOCAL (jamais la production), avec de vrais comptes, par les MÊMES appels que l'app
// (supabase-js, clé anon + jeton du compte) : inscription → profil → enfants → compétences → carnet avec fichier
// (privé / foyer) → agenda → invitation d'un second responsable → mot de l'enseignant, signature, accusé de lecture,
// fil avec l'enseignant → effacement d'un enfant (demande, annulation) → départ d'un responsable → anonyme.
// Sert de filet après un changement de droits (M32) : si une table utilisée par l'app perdait un droit nécessaire,
// ce parcours échoue. Contrôle aussi, pour CHAQUE table appelée par le code de l'app (src/), l'absence de
// « permission denied » côté compte connecté.
// Prérequis : `npx supabase start` ; migrations appliquées en local. Lancer : npm run test:parcours-complet-local
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
if (!/127\.0\.0\.1|localhost/.test(API)) throw new Error('Refus : ce parcours ne tourne que sur le Supabase LOCAL.');
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sans = () => createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}
const err = (e: { code?: string; message?: string } | null | undefined) => `${e?.code ?? ''} ${e?.message ?? ''}`.trim();

const t = Date.now();
const mdp = 'Parcours-test-2026!';
async function connecter(email: string) {
  const c = sans();
  const { data, error } = await c.auth.signInWithPassword({ email, password: mdp });
  if (error) throw new Error(`connexion ${email} : ${error.message}`);
  return { client: c, id: data.user.id };
}
async function compte(prefixe: string, prenom: string, role: 'parent' | 'enseignant' = 'parent') {
  const email = `${prefixe}-${t}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent', first_name: prenom } });
  if (error) throw new Error(error.message);
  if (role === 'enseignant') sql(`update public.profiles set role = 'enseignant', first_name = '${prenom}', family_name = 'Prof' where id = '${data.user.id}'`);
  const s = await connecter(email);
  return { ...s, email };
}

// ─── 1. Inscription (anonyme → compte) ──────────────────────────────────────
{
  const email = `inscrit-${t}@exemple.test`;
  const c = sans();
  const { data, error } = await c.auth.signUp({ email, password: mdp, options: { data: { family_name: 'Moreau', role: 'enseignant' } } });
  verifier('1. inscription : compte créé', !error && !!data.user, err(error));
  verifier('1. bis inscription : pas de session avant confirmation de l’email', !data.session);
  const role = sql(`select role from public.profiles where id = '${data.user?.id}'`);
  verifier('1. ter profil créé automatiquement, TOUJOURS « parent » même si « enseignant » est demandé', role === 'parent', role);
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: mdp });
  verifier('1. quater connexion refusée tant que l’email n’est pas confirmé', !!e2);
  await admin.auth.admin.updateUserById(data.user!.id, { email_confirm: true });
  const { error: e3 } = await c.auth.signInWithPassword({ email, password: mdp });
  verifier('1. quinquies connexion après confirmation', !e3, err(e3));
  const { data: moi } = await c.from('profiles').select('role, plan').eq('id', data.user!.id).single();
  verifier('1. sexies le compte lit SON profil (parent, forfait gratuit)', moi?.role === 'parent' && moi?.plan === 'free', JSON.stringify(moi));
}

// ─── 2. Parent A : enfants, couleur, compétences ────────────────────────────
const A = await compte('claire', 'Claire');
const creer = async (c: typeof A, prenom: string, classe: string) => {
  const { data, error } = await c.client.rpc('create_child', { p_first_name: prenom, p_last_name: 'Moreau', p_birth_date: null, p_age: 8, p_classe: classe, p_school: 'École test' });
  if (error) throw new Error(`create_child : ${err(error)}`);
  return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
};
const LEA = await creer(A, 'Léa', 'CP');
const TOM = await creer(A, 'Tom', 'CM2');
{
  const { data, error } = await A.client.from('children').select('id, first_name').order('created_at');
  verifier('2. A lit ses 2 enfants', !error && data?.length === 2, err(error));
  const { error: e2 } = await A.client.from('children').update({ color: '#0F766E' }).eq('id', LEA);
  verifier('2. bis A change la couleur de Léa', !e2, err(e2));
  const { data: ay } = await A.client.from('academic_years').select('id, statut').eq('student_id', LEA);
  verifier('2. ter Léa a une année active', ay?.length === 1 && ay[0].statut === 'active');
  var Y = ay![0].id as string;
  const { error: e3 } = await A.client.from('competences').insert({ child_id: LEA, academic_year_id: Y, domaine: 'Français', competence: 'Lire un mot', niveau: 2, echelle: 4, periode: 1, source: 'parent', saisi_par: A.id });
  const { data: comp } = await A.client.from('competences').select('source').eq('child_id', LEA);
  verifier('2. quater compétence ajoutée par le parent, source « parent » imposée par le serveur', !e3 && comp?.length === 1 && comp[0].source === 'parent', err(e3));
}

// ─── 3. Carnet : fichier foyer + jalon privé, URL signée ────────────────────
const octets = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
const fichierFoyer = `${LEA}/${Y}/${randomUUID()}.jpg`;
const fichierPrive = `${LEA}/${Y}/${randomUUID()}.jpg`;
{
  for (const [chemin, visibilite, titre] of [[fichierFoyer, 'foyer', 'Dessin partagé'], [fichierPrive, 'prive', 'Note privée de Claire']] as const) {
    const up = await A.client.storage.from('carnet').upload(chemin, octets, { contentType: 'image/jpeg' });
    const ins = await A.client.from('carnet_items').insert({ child_id: LEA, academic_year_id: Y, categorie: 'souvenir', titre, fichier: chemin, date: new Date().toISOString().slice(0, 10), ajoute_par: A.id, visibilite });
    verifier(`3. A ajoute « ${titre} » (fichier + ligne)`, !up.error && !ins.error, err(up.error) + err(ins.error));
  }
  const { data: items } = await A.client.from('carnet_items').select('id, visibilite');
  verifier('3. bis A lit ses 2 éléments', items?.length === 2);
  const url = await A.client.storage.from('carnet').createSignedUrl(fichierFoyer, 3600);
  const dl = url.data ? await fetch(url.data.signedUrl) : null;
  verifier('3. ter URL signée d’1 h : le fichier se télécharge, octets identiques', !!dl && dl.ok && Buffer.from(await dl.arrayBuffer()).equals(Buffer.from(octets)), err(url.error));
}

// ─── 4. Agenda ──────────────────────────────────────────────────────────────
{
  const { data, error } = await A.client.from('agenda_events').insert({ child_id: LEA, parent_id: A.id, title: 'Sortie piscine', event_type: 'sortie', start_time: new Date(Date.now() + 86400000).toISOString() }).select('id').single();
  verifier('4. A crée un événement', !error, err(error));
  const { error: e2 } = await A.client.from('agenda_events').update({ is_done: true }).eq('id', data!.id);
  const { data: lu } = await A.client.from('agenda_events').select('is_done').eq('id', data!.id).single();
  verifier('4. bis A coche l’événement, relu', !e2 && lu?.is_done === true, err(e2));
}

// ─── 5. Invitation d'un second responsable ──────────────────────────────────
const B = await compte('marc', 'Marc');
{
  const { error } = await A.client.from('invitations_responsable').insert({ child_id: LEA, invited_by: A.id, invited_email: B.email });
  verifier('5. A invite B (par email)', !error, err(error));
  const { data: directes } = await B.client.from('invitations_responsable').select('id');
  verifier('5. bis B ne lit PAS la table des invitations (M32)', (directes ?? []).length === 0);
  const { data: recues, error: e2 } = await B.client.rpc('mes_invitations');
  verifier('5. ter B voit l’invitation par mes_invitations() (prénoms seuls)', !e2 && recues?.length === 1 && !('child_id' in recues[0]), err(e2));
  const { data: r, error: e3 } = await B.client.rpc('respond_invitation', { p_invitation_id: recues![0].invitation_id, p_accept: true });
  verifier('5. quater B accepte', !e3 && r === 'acceptee', err(e3) + String(r));
  const { data: enfantsB } = await B.client.from('children').select('first_name');
  verifier('5. quinquies B lit Léa (et pas Tom)', enfantsB?.length === 1 && enfantsB[0].first_name === 'Léa');
  const { data: itemsB } = await B.client.from('carnet_items').select('titre');
  verifier('5. sexies B lit le dessin partagé, PAS la note privée de A', itemsB?.length === 1 && itemsB[0].titre === 'Dessin partagé', JSON.stringify(itemsB));
  const ok1 = await B.client.storage.from('carnet').createSignedUrl(fichierFoyer, 60);
  const ko1 = await B.client.storage.from('carnet').createSignedUrl(fichierPrive, 60);
  verifier('5. septies B obtient l’URL du fichier partagé, refus pour le fichier privé', !!ok1.data && !ko1.data);
}

// ─── 6. Enseignant : mot, signature, accusé de lecture, fil ─────────────────
const T = await compte('prof', 'Sophie', 'enseignant');
const ecole = sql(`insert into public.ecoles (nom) values ('École parcours') returning id`).split('\n')[0];
const classe = sql(`insert into public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) values ('${ecole}', (select annee_scolaire from public.academic_years where id = '${Y}'), 'CP', 'CP parcours', '${T.id}') returning id`).split('\n')[0];
sql(`update public.academic_years set classe_id = '${classe}' where id = '${Y}'`);
let mot = '';
{
  const { data, error } = await T.client.from('mots_liaison').insert({ teacher_id: T.id, classe: 'CP parcours', classe_id: classe, type: 'signature', titre: 'Sortie piscine', contenu: 'Prévoir un maillot.', statut: 'envoyé', signature_mode: 'both' }).select('id').single();
  verifier('6. l’enseignante envoie un mot à sa classe', !error, err(error));
  mot = data!.id;
  const { data: carnetsA, error: e2 } = await A.client.from('mot_carnets').select('mots_liaison(id, titre, statut, signature_mode)').eq('child_id', LEA);
  verifier('6. bis la copie du mot arrive dans le carnet de Léa (lecture comme l’app)', !e2 && carnetsA?.length === 1, err(e2));
  const { error: e3 } = await A.client.from('read_receipts').insert({ mot_id: mot, parent_id: A.id });
  verifier('6. ter A marque le mot lu', !e3, err(e3));
  const { error: e4 } = await A.client.from('signatures').insert({ mot_id: mot, parent_id: A.id, student_id: LEA });
  verifier('6. quater A signe', !e4, err(e4));
  const { data: sigsB } = await B.client.from('signatures').select('parent_id').eq('mot_id', mot);
  verifier('6. quinquies B voit la signature de A (statut partagé entre responsables)', sigsB?.length === 1);
  const { error: e5 } = await B.client.from('signatures').insert({ mot_id: mot, parent_id: B.id, student_id: LEA });
  verifier('6. sexies B signe aussi (une signature par responsable)', !e5, err(e5));
  const { data: statutMot } = await A.client.from('mot_carnets_statut').select('*').eq('child_id', LEA);
  verifier('6. septies la vue de statut du carnet répond', (statutMot ?? []).length === 1);
  const { data: sigsT } = await T.client.from('signatures').select('parent_id').eq('mot_id', mot);
  verifier('6. octies l’enseignante voit les 2 signatures de son mot', sigsT?.length === 2);
}
{
  const fil = (await admin.from('teacher_conversations').insert({ teacher_id: T.id, parent_id: A.id, student_id: LEA, portee: 'individuel', parent_name: 'Claire Moreau' }).select('id').single()).data!.id;
  const { error } = await A.client.from('teacher_messages').insert({ conversation_id: fil, sender_role: 'parent', sender_id: A.id, text: 'Bonjour, Léa sera absente lundi.' });
  verifier('6. nonies A écrit à l’enseignante dans son fil', !error, err(error));
  const { data: lus } = await T.client.from('teacher_messages').select('text').eq('conversation_id', fil);
  verifier('6. decies l’enseignante lit le message', lus?.length === 1);
  const { data: filsB } = await B.client.from('teacher_conversations').select('id');
  verifier('6. undecies B ne voit PAS le fil individuel de A', (filsB ?? []).length === 0);
}

// ─── 7. Effacement d'un enfant (demande puis annulation) ────────────────────
{
  const { error } = await A.client.rpc('demander_effacement_enfant', { p_child_id: TOM });
  verifier('7. A demande l’effacement de Tom (délai de 30 jours)', !error, err(error));
  const { data: dem } = await A.client.rpc('mes_effacements');
  verifier('7. bis la demande est visible', Array.isArray(dem) && dem.length === 1, JSON.stringify(dem));
  const id = (dem as any[])[0]?.demande_id ?? (dem as any[])[0]?.id;
  const { error: e2 } = await A.client.rpc('annuler_effacement', { p_demande_id: id });
  verifier('7. ter A annule : rien n’est perdu', !e2, err(e2));
  const { data: tom } = await A.client.from('children').select('id').eq('id', TOM);
  verifier('7. quater Tom est toujours là', tom?.length === 1);
}

// ─── 8. Départ d'un responsable ─────────────────────────────────────────────
{
  const { data: apercu, error } = await B.client.rpc('apercu_depart_carnet', { p_child_id: LEA });
  verifier('8. B voit ce que son départ change', !error && !!apercu, err(error));
  const { error: e2 } = await B.client.rpc('quitter_carnet', { p_child_id: LEA });
  verifier('8. bis B quitte le carnet de Léa', !e2, err(e2));
  const { data: apres } = await B.client.from('children').select('id');
  verifier('8. ter B ne voit plus Léa', (apres ?? []).length === 0);
  const { data: sigs } = await A.client.from('signatures').select('parent_id').eq('mot_id', mot);
  verifier('8. quater sa signature est conservée', sigs?.length === 2);
}

// ─── 9. Toute table appelée par le code de l'app : jamais « permission denied » côté compte connecté ──
{
  const sources: string[] = [];
  const marche = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) marche(p);
      else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) sources.push(readFileSync(p, 'utf8'));
    }
  };
  marche('src');
  const tables = [...new Set(sources.flatMap((s) => [...s.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1])))].filter((x) => x !== 'carnet').sort();
  const COUPEES = new Set(['messages', 'deletion_requests', 'export_history', 'transfer_codes', 'access_journal', 'person_permissions']);
  const refusees: string[] = [];
  const notees: string[] = [];
  for (const table of tables) {
    const { error } = await A.client.from(table).select('*').limit(1);
    const refus = error?.code === '42501' || /permission denied/i.test(error?.message ?? '');
    if (refus && COUPEES.has(table)) notees.push(table);
    else if (refus) refusees.push(table);
  }
  verifier(`9. ${tables.length} tables appelées par l’app : aucune ne refuse l’accès à un compte connecté`, refusees.length === 0, `refusées : ${refusees.join(', ')}`);
  console.log(`   (accès coupé voulu, attendu : ${notees.join(', ') || 'aucune'} — appelées par du code d’écrans non atteignables : voir tasks/audit-ecarts-decisions.md)`);
}

// ─── 10. Anonyme : rien ──────────────────────────────────────────────────────
{
  const c = sans();
  const lectures = await Promise.all(['children', 'profiles', 'carnet_items', 'signatures', 'mots_liaison', 'invitations_responsable', 'agenda_events'].map((x) => c.from(x).select('*').limit(1)));
  verifier('10. anonyme : aucune table lisible (droits retirés)', lectures.every((r) => !!r.error), JSON.stringify(lectures.map((r) => r.error?.code)));
  const { error } = await c.rpc('mes_invitations');
  verifier('10. bis anonyme : fonctions refusées', !!error);
}

console.log(`\n${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
