// AUDIT DE SÉCURITÉ — tests d'autorisation contre le Supabase LOCAL (jamais la production).
// Acteurs : A = parent propriétaire (foyer 1, enfant Léa) ; B = parent d'un AUTRE foyer ; T0 = enseignant non rattaché ;
// TE = enseignant titulaire de la classe de Léa ; ANON = sans compte. Données de test dans toutes les tables d'enfants.
// Pour chaque table : SELECT / INSERT / UPDATE / DELETE tentés par B, T0, ANON (tout doit être refusé) ; SELECT par TE
// (autorisé seulement là où le rôle le justifie). Les appels de fonctions (RPC) sont testés ensuite, puis le stockage.
// Sortie : scripts/audit-securite-resultats.json (lu par le générateur du rapport).
// Prérequis : `npx supabase start`. Lancer : npm run audit:securite-local
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API: string = statut.API_URL;
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(API);
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();
const admin = createClient(API, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sans = () => createClient(API, statut.ANON_KEY, { auth: { persistSession: false } });

type Acteur = 'B' | 'T0' | 'ANON' | 'TE';
type Resultat = { table: string; operation: string; acteur: string; resultat: string; ecart: boolean; detail?: string };
const R: Resultat[] = [];
const noter = (table: string, operation: string, acteur: string, resultat: string, ecart: boolean, detail = '') =>
  R.push({ table, operation, acteur, resultat, ecart, detail });

// ── Comptes ──
const t = Date.now();
const mdp = 'Audit-test-2026!';
async function compte(prefixe: string, role: 'parent' | 'enseignant') {
  const email = `${prefixe}-${t}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role } });
  if (error) throw new Error(`${prefixe}: ${error.message}`);
  if (role === 'enseignant') sql(`update public.profiles set role = 'enseignant', first_name = 'Prof', family_name = '${prefixe}' where id = '${data.user!.id}'`);
  else sql(`update public.profiles set first_name = '${prefixe}', family_name = 'Test' where id = '${data.user!.id}'`);
  const c = sans();
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: mdp });
  if (e2) throw new Error(e2.message);
  return { id: data.user!.id, email, client: c };
}
const A = await compte('claire', 'parent');
const B = await compte('bruno', 'parent');
const Z = await compte('zoe', 'parent'); // compte tiers (destinataire de messages, demande d'effacement)
const T0 = await compte('prof-libre', 'enseignant');
const TE = await compte('prof-titulaire', 'enseignant');
const clients: Record<Acteur, SupabaseClient> = { B: B.client, T0: T0.client, ANON: sans(), TE: TE.client };

// ── Données de test ──
const creer = async (c: typeof A, prenom: string) => {
  const { data, error } = await c.client.rpc('create_child', { p_first_name: prenom, p_last_name: 'Test', p_birth_date: null, p_age: 9, p_classe: 'CM2', p_school: 'École test' });
  if (error) throw new Error(error.message);
  return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
};
const L = await creer(A, 'Léa');
const ZOE = await creer(B, 'Zoé');
const Y = sql(`select id from public.academic_years where student_id = '${L}'`);
const F = sql(`select foyer_id from public.responsables where child_id = '${L}'`);
const E = sql(`insert into public.ecoles (nom) values ('École audit') returning id`).split('\n')[0];
const K = sql(`insert into public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) values ('${E}', (select annee_scolaire from public.academic_years where id = '${Y}'), 'CM2', 'CM2 audit', '${TE.id}') returning id`).split('\n')[0];
sql(`update public.academic_years set classe_id = '${K}' where id = '${Y}'`);
const aujourdhui = new Date().toISOString().slice(0, 10);
const maintenant = new Date().toISOString();

type Spec = { seed?: Record<string, unknown>; seed2?: Record<string, unknown>; attaque?: Record<string, unknown>; modif?: Record<string, unknown>; te?: boolean };
const ids: Record<string, string> = {};
async function inserer(table: string, ligne: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from(table).insert(ligne).select('id').single();
  if (error) throw new Error(`seed ${table}: ${error.message}`);
  return (data as any).id as string;
}

const S = await inserer('subjects', { child_id: L, name: 'Maths' });
ids.subjects = S;
ids.mots_liaison = await inserer('mots_liaison', { teacher_id: TE.id, classe: 'CM2 audit', type: 'autorisation', titre: 'Sortie audit', contenu: 'texte du mot', statut: 'envoyé', signature_mode: 'one', classe_id: K });
const M = ids.mots_liaison;
ids.mot_carnets = sql(`select id from public.mot_carnets where mot_id = '${M}' and child_id = '${L}'`);
const P = await inserer('class_posts', { teacher_id: TE.id, classe: 'CM2 audit', type: 'annonce', title: 'Annonce audit', content: 'x', classe_id: K });
const CV = await inserer('aria_conversations', { parent_id: A.id, child_id: L, title: 'secret aria' });
const FIL = await inserer('teacher_conversations', { teacher_id: TE.id, parent_id: A.id, student_id: L, portee: 'individuel', parent_name: 'Claire Test' });

const specs: Record<string, Spec> = {
  absences: { seed: { student_id: L, student_name: 'Léa', signalee_par: A.id, motif: 'maladie', demi_journee: 'matin', date_debut: aujourdhui, date_fin: aujourdhui }, attaque: { student_id: L, signalee_par: B.id, motif: 'autre', demi_journee: 'matin', date_debut: aujourdhui, date_fin: aujourdhui }, modif: { commentaire: 'HACK' } },
  access_journal: { seed: { family_id: A.id, person_name: 'Claire', action: 'a consulté', module: 'notes' }, attaque: { family_id: A.id, person_name: 'faux', action: 'x', module: 'x' }, modif: { person_name: 'HACK' } },
  agenda_events: { seed: { child_id: L, parent_id: A.id, title: 'RDV médecin', event_type: 'reunion', start_time: maintenant }, attaque: { child_id: L, parent_id: B.id, title: 'faux', event_type: 'reunion', start_time: maintenant }, modif: { title: 'HACK' } },
  alertes_urgence: { seed: { auteur_id: A.id, child_id: L, categorie: 'harcelement' }, attaque: { auteur_id: B.id, child_id: L, categorie: 'harcelement' }, modif: { categorie: 'suicide' } },
  appreciations: { seed: { teacher_id: TE.id, student_id: L, student_name: 'Léa', level: 'bien', text: 'appréciation', status: 'draft' }, attaque: { teacher_id: B.id, student_id: L, student_name: 'Léa', level: 'bien', text: 'faux' }, modif: { text: 'HACK' }, te: true },
  aria_conversations: { seed: undefined, attaque: { parent_id: B.id, child_id: L, title: 'faux' }, modif: { title: 'HACK' } },
  aria_messages: { seed: { conversation_id: CV, role: 'user', content: 'message très privé' }, attaque: { conversation_id: CV, role: 'user', content: 'faux' }, modif: { content: 'HACK' } },
  bulletins: { seed: { child_id: L, academic_year_id: Y, period: 'Trimestre 1', content: {} }, attaque: { child_id: L, academic_year_id: Y, period: 'Trimestre 2', content: {} }, modif: { teacher_appreciation: 'HACK' } },
  carnet_items: { seed: { child_id: L, categorie: 'souvenir', titre: 'partagé', ajoute_par: A.id, visibilite: 'foyer' }, seed2: { child_id: L, categorie: 'jalon', titre: 'privé', ajoute_par: A.id, visibilite: 'prive' }, attaque: { child_id: L, categorie: 'jalon', titre: 'faux', ajoute_par: B.id, visibilite: 'foyer' }, modif: { titre: 'HACK' } },
  checkins: { seed: { child_id: L, mode: 'primaire', emotion: 'joie', joy_score: 7, message: 'confidentiel', is_confidential: true }, attaque: { child_id: L, mode: 'primaire', emotion: 'joie', joy_score: 5 }, modif: { message: 'HACK' } },
  class_events: { seed: { teacher_id: TE.id, classe: 'CM2 audit', title: 'Kermesse', event_date: aujourdhui, classe_id: K }, attaque: { teacher_id: B.id, title: 'faux', event_date: aujourdhui, classe_id: K }, modif: { title: 'HACK' }, te: true },
  class_post_reactions: { seed: { post_id: P, user_id: A.id, emoji: '👍' }, attaque: { post_id: P, user_id: B.id, emoji: '👎' }, modif: { emoji: '💥' } },
  class_post_seen: { seed: { post_id: P, parent_id: A.id }, attaque: { post_id: P, parent_id: B.id }, modif: { seen_at: '2020-01-01T00:00:00Z' }, te: true },
  class_posts: { seed: undefined, attaque: { teacher_id: B.id, type: 'annonce', title: 'faux', content: 'x', classe_id: K }, modif: { title: 'HACK' }, te: true },
  competences: { seed: { child_id: L, academic_year_id: Y, domaine: 'Français', competence: 'Lire', niveau: 3, source: 'ecole', saisi_par: TE.id, echelle: 4, periode: 1 }, attaque: { child_id: L, academic_year_id: Y, domaine: 'x', competence: 'faux', niveau: 1, source: 'parent', saisi_par: B.id, echelle: 4, periode: 1 }, modif: { competence: 'HACK' }, te: true },
  deletion_requests: { seed: { family_id: A.id, scope: 'child', child_id: L, confirm_email: 'a@exemple.test' }, attaque: { family_id: A.id, scope: 'child', confirm_email: 'x@exemple.test' }, modif: { status: 'cancelled' } },
  export_history: { seed: { family_id: A.id, format: 'json', modules: [], total_size: '1 Mo' }, attaque: { family_id: A.id, format: 'json', modules: [], total_size: 'x' }, modif: { total_size: 'HACK' } },
  grades: { seed: { child_id: L, subject_id: S, value: 14, max_value: 20, type: 'ds', date: aujourdhui, trimester: 1, source: 'manual' }, attaque: { child_id: L, subject_id: S, value: 1, max_value: 20, type: 'ds', date: aujourdhui, trimester: 1, source: 'manual' }, modif: { comment: 'HACK' } },
  invitations_responsable: { seed: { child_id: L, invited_by: A.id, invited_email: 'invitee@exemple.test' }, attaque: { child_id: L, invited_by: B.id, invited_email: 'bruno@exemple.test' }, modif: { statut: 'acceptee' } },
  messages: { seed: { sender_id: A.id, receiver_id: Z.id, subject: 'privé', body: 'message entre parents', child_id: L }, attaque: { sender_id: B.id, receiver_id: Z.id, body: 'faux', child_id: L }, modif: { body: 'HACK' } },
  mot_carnets: { seed: undefined, attaque: { mot_id: M, child_id: ZOE }, modif: { child_id: ZOE }, te: true },
  mots_liaison: { seed: undefined, attaque: { teacher_id: B.id, type: 'information', titre: 'faux mot', contenu: 'x', statut: 'brouillon' }, modif: { titre: 'HACK' }, te: true },
  person_permissions: { seed: { family_id: A.id, name: 'Mamie', email: 'mamie@exemple.test' }, attaque: { family_id: A.id, name: 'faux' }, modif: { name: 'HACK' } },
  read_receipts: { seed: { mot_id: M, parent_id: A.id }, attaque: { mot_id: M, parent_id: B.id }, modif: { read_at: '2020-01-01T00:00:00Z' } },
  reponses_mot: { seed: { mot_id: M, child_id: L, responsable_id: A.id, autorisation: true }, attaque: { mot_id: M, child_id: L, responsable_id: B.id, autorisation: false }, modif: { autorisation: false }, te: true },
  signatures: { seed: { mot_id: M, student_id: L, parent_id: A.id }, attaque: { mot_id: M, student_id: L, parent_id: B.id }, modif: { parent_name: 'HACK' }, te: true },
  subjects: { seed: undefined, attaque: { child_id: L, name: 'faux' }, modif: { name: 'HACK' } },
  teacher_conversations: { seed: undefined, attaque: { teacher_id: B.id, parent_id: B.id, student_id: L, portee: 'individuel' }, modif: { last_message: 'HACK' }, te: true },
  teacher_messages: { seed: { conversation_id: FIL, sender_role: 'parent', sender_id: A.id, text: 'message privé au prof' }, attaque: { conversation_id: FIL, sender_role: 'parent', sender_id: B.id, text: 'faux' }, modif: { text: 'HACK' }, te: true },
  transfer_codes: { seed: { family_id: A.id, child_id: L, child_name: 'Léa', child_avatar: 'x', code: `SCA-AUDIT-${t}`, from_school: 'x' }, attaque: { family_id: A.id, child_id: L, code: `FAUX-${t}`, from_school: 'x' }, modif: { to_school: 'HACK' } },
};
// Tables dont la ligne de départ existe déjà (créée ci-dessus ou par create_child)
ids.aria_conversations = CV;
ids.class_posts = P;
ids.teacher_conversations = FIL;
ids.academic_years = Y;
ids.children = L;
ids.classes = K;
ids.ecoles = E;
ids.foyers = F;
ids.profiles = A.id;
ids.responsables = sql(`select id from public.responsables where child_id = '${L}' and user_id = '${A.id}'`);
for (const [table, spec] of Object.entries(specs)) {
  if (spec.seed) ids[table] = await inserer(table, spec.seed);
  if (spec.seed2) ids[table + '#2'] = await inserer(table, spec.seed2);
}
// Demande d'effacement d'un compte TIERS (Z) : B / T0 / ANON ne doivent pas la lire
sql(`insert into public.demandes_effacement (portee, user_id) values ('compte', '${Z.id}')`);
ids.demandes_effacement = sql(`select id from public.demandes_effacement where user_id = '${Z.id}'`);
sql(`insert into public.departs_foyer (foyer_id, child_id, user_id) values ('${F}', '${L}', '${Z.id}')`);
ids.departs_foyer = sql(`select id from public.departs_foyer limit 1`);

// Complète specs pour les tables « de base » (sans seed propre)
const base: Record<string, Spec> = {
  children: { attaque: { first_name: 'Hack', last_name: 'X', parent_id: B.id }, modif: { last_name: 'HACK' } },
  academic_years: { attaque: { student_id: L, annee_scolaire: '2019-2020', niveau: 'CM1', statut: 'archivee' }, modif: { etablissement: 'HACK' } },
  classes: { attaque: { ecole_id: E, annee_scolaire: '2026-2027', niveau: 'CM2', nom: 'faux', enseignant_id: B.id }, modif: { nom: 'HACK' }, te: true },
  ecoles: { attaque: { nom: 'faux' }, modif: { nom: 'HACK' }, te: true },
  foyers: { attaque: { nom: 'faux' }, modif: { nom: 'HACK' } },
  profiles: { attaque: { id: B.id, email: 'x@x.x' }, modif: { first_name: 'HACK' }, te: false },
  responsables: { attaque: { foyer_id: F, user_id: B.id, child_id: L }, modif: { lien: 'autre' } },
  demandes_effacement: { attaque: { portee: 'compte', user_id: B.id }, modif: { annulee_le: maintenant } },
  departs_foyer: { attaque: { foyer_id: F, child_id: L, user_id: B.id }, modif: { user_id: B.id } },
};
for (const [k, v] of Object.entries(base)) specs[k] = { ...v, ...(specs[k] ?? {}) };
specs.aria_conversations.te = false;

// Vérifie en base (service) la valeur d'une colonne / l'existence d'une ligne
const valeur = (table: string, id: string, col: string) => sql(`select ${col}::text from public.${table} where id = '${id}'`);
const existe = (table: string, id: string) => sql(`select count(*) from public.${table} where id = '${id}'`) === '1';

const AUTORISE_TE_LECTURE = new Set(['class_post_reactions', 'appreciations', 'class_events', 'class_post_seen', 'class_posts', 'classes', 'competences', 'ecoles', 'mot_carnets', 'mots_liaison', 'reponses_mot', 'signatures', 'teacher_conversations', 'teacher_messages']);

for (const [table, spec] of Object.entries(specs)) {
  const id = ids[table];
  const acteurs: Acteur[] = ['B', 'T0', 'ANON'];
  for (const a of [...acteurs, 'TE' as Acteur]) {
    const c = clients[a];
    // SELECT
    const { data, error } = await c.from(table).select('*').eq('id', id);
    const lu = !error && (data?.length ?? 0) > 0;
    // Un enseignant titulaire n'a droit qu'à ce que son rôle justifie ; tout le reste = écart
    const attendu = a === 'TE' ? AUTORISE_TE_LECTURE.has(table) : false;
    if (a === 'TE' && !lu && attendu) noter(table, 'SELECT', a, 'refusé (lecture attendue pour son rôle)', false, 'à vérifier côté fonctionnel');
    else noter(table, 'SELECT', a, lu ? `LIT la ligne de A${attendu ? ' (attendu : rôle enseignant)' : ''}` : error ? `refusé (${error.code ?? error.message.slice(0, 40)})` : '0 ligne', lu && !attendu);
    if (a === 'TE') continue;
    // INSERT
    if (spec.attaque) {
      const connus = sql(`select id from public.${table}`).split(String.fromCharCode(10)).filter(Boolean).map((x) => `'${x}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
      const { error: e2 } = await c.from(table).insert(spec.attaque);
      if (!e2) {
        noter(table, 'INSERT', a, 'ÉCRIT une ligne', true, JSON.stringify(Object.keys(spec.attaque)));
        sql(`delete from public.${table} where id not in (${connus})`); // nettoyage
      } else noter(table, 'INSERT', a, `refusé (${e2.code ?? e2.message.slice(0, 40)})`, false);
    }
    // UPDATE
    if (spec.modif && id) {
      const col = Object.keys(spec.modif)[0];
      const avant = valeur(table, id, col);
      await c.from(table).update(spec.modif).eq('id', id);
      const apres = valeur(table, id, col);
      const change = apres !== avant;
      noter(table, 'UPDATE', a, change ? 'MODIFIE la ligne de A' : 'refusé / 0 ligne', change, change ? col : '');
      if (change) sql(`update public.${table} set ${col} = ${avant === '' ? 'NULL' : `'${avant.replace(/'/g, "''")}'`} where id = '${id}'`);
    }
    // DELETE
    if (id) {
      await c.from(table).delete().eq('id', id);
      const encore = existe(table, id);
      noter(table, 'DELETE', a, encore ? 'refusé / 0 ligne' : 'SUPPRIME la ligne de A', !encore);
      if (!encore) {
        if (!spec.seed) throw new Error(`audit interrompu : ${table} supprimée par ${a} (écart critique à corriger avant de continuer)`);
        ids[table] = await inserer(table, spec.seed); // on reconstitue la ligne pour la suite de l'audit
      }
    }
  }
}

// ── Vues (security_invoker) ──
const vues: [string, string, string][] = [['child_overview', 'child_id', L], ['subject_averages', 'child_id', L], ['mot_carnets_statut', 'child_id', L], ['mots_liaison_enriched', 'id', M]];
for (const [vue, col, val] of vues) {
  for (const a of ['B', 'T0', 'ANON'] as Acteur[]) {
    const { data, error } = await clients[a].from(vue).select('*').eq(col, val);
    const lu = !error && (data?.length ?? 0) > 0;
    noter(vue + ' (vue)', 'SELECT', a, lu ? 'LIT les données de Léa' : error ? `refusé (${error.code})` : '0 ligne', lu);
  }
}

// ── Fonctions (RPC) appelées par un compte qui n'a aucun droit sur Léa ──
type Appel = [string, Record<string, unknown>, (d: unknown) => boolean /* true = fuite / action indue */, string?];
const idFil = FIL;
const appels: Appel[] = [
  ['responsables_enfant', { p_child_id: L }, (d) => Array.isArray(d) && d.length > 0],
  ['apercu_depart_carnet', { p_child_id: L }, (d) => { const l = Array.isArray(d) ? d[0] : d; return !!l && (l.nb_responsables > 0 || l.nb_prives > 0 || l.nb_partages > 0); }],
  ['quitter_carnet', { p_child_id: L }, () => false, 'doit être une erreur'],
  ['est_titulaire_enfant', { p_child_id: L, p_teacher_id: TE.id }, (d) => d === true, 'oracle : « ce prof est titulaire de cet enfant ? »'],
  ['est_du_foyer', { p_foyer_id: F, p_child_id: L }, (d) => d === true],
  ['is_responsable', { p_child_id: L }, (d) => d === true],
  ['decoupage_annee', { p_academic_year_id: Y }, (d) => d != null],
  ['echelle_competences_annee', { p_academic_year_id: Y }, (d) => d != null],
  ['nb_responsables_carnet', { p_mot_id: M, p_child_id: L }, (d) => d != null && d !== 0],
  ['mot_expediteur', { p_mot_id: M }, (d) => d != null],
  ['fil_enseignant', { p_conversation_id: idFil }, (d) => d != null],
  ['peut_lire_fil', { p_conversation_id: idFil }, (d) => d === true],
  ['role_dans_fil', { p_conversation_id: idFil }, (d) => d != null],
  ['depart_du_fil', { p_conversation_id: idFil }, (d) => d != null],
  ['envoye_aussi_a', { p_message_id: idFil }, (d) => Array.isArray(d) && d.length > 0],
  ['distribuer_mot', { p_mot_id: M, p_child_ids: [L] }, (d) => typeof d === 'number' && d > 0],
  ['envoyer_a_tous_les_representants', { p_child_id: L, p_text: 'message intrus' }, (d) => d != null],
  ['demander_effacement_enfant', { p_child_id: L }, (d) => d != null],
  ['annuler_effacement', { p_demande_id: ids.demandes_effacement }, () => false, 'doit être une erreur'],
  ['respond_invitation', { p_invitation_id: ids.invitations_responsable, p_accept: true }, () => false, 'doit être une erreur'],
  ['mes_invitations', {}, (d) => Array.isArray(d) && d.some((x: any) => x.prenom_enfant)],
  ['mes_effacements', {}, (d) => Array.isArray(d) && d.length > 0],
  ['apercu_effacement_compte', {}, (d) => Array.isArray(d) && d.some((x: any) => x.prenom_enfant === 'Léa')],
  ['carnet_chemin_autorise', { p_name: `${L}/${Y}/11111111-1111-4111-8111-111111111111.jpg` }, (d) => d === true],
  ['effacements_dus', {}, (d) => Array.isArray(d)],
  ['enfants_a_effacer', { p_demande_id: ids.demandes_effacement }, (d) => d != null],
  ['fichiers_a_effacer', { p_demande_id: ids.demandes_effacement }, (d) => d != null],
  ['fichiers_orphelins', {}, (d) => d != null],
  ['executer_effacement', { p_demande_id: ids.demandes_effacement }, () => false, 'doit être une erreur'],
  ['marquer_effacement_execute', { p_demande_id: ids.demandes_effacement }, () => false, 'doit être une erreur'],
  ['lancer_executer_effacements', {}, () => false, 'doit être une erreur'],
  ['journaliser_executions_effacement', {}, () => false, 'doit être une erreur'],
];
// Oracles d'état : on place A en « effacement de compte » et son enfant en « effacement d'enfant » pour voir si un tiers le détecte
sql(`insert into public.demandes_effacement (portee, user_id) values ('compte', '${A.id}')`);
appels.push(['compte_en_effacement', { p_user_id: A.id }, (d) => d === true, 'oracle : état d\'effacement du compte de A']);
sql(`delete from public.demandes_effacement where user_id = '${A.id}'`);
sql(`insert into public.demandes_effacement (portee, child_id, user_id) values ('enfant', '${L}', '${A.id}')`);
appels.push(['enfant_en_effacement', { p_child_id: L }, (d) => d === true, 'oracle : état d\'effacement de l\'enfant']);
sql(`delete from public.demandes_effacement where child_id = '${L}'`);
// états de test posés pour les oracles : on les retire pour la suite des mesures
for (const [fn, args, fuite, note] of appels) {
  const oracle = fn.endsWith('_en_effacement');
  if (fn === 'compte_en_effacement') sql(`insert into public.demandes_effacement (portee, user_id) values ('compte', '${A.id}')`);
  if (fn === 'enfant_en_effacement') sql(`insert into public.demandes_effacement (portee, child_id, user_id) values ('enfant', '${L}', '${A.id}')`);
  for (const a of ['B', 'T0', 'ANON'] as Acteur[]) {
    const { data, error } = await clients[a].rpc(fn, args);
    const f = !error && fuite(data);
    noter(`rpc ${fn}`, 'APPEL', a, error ? `refusé (${error.code ?? error.message.slice(0, 40)})` : f ? `RÉPOND / AGIT${oracle ? ' : l\'état est révélé' : ''}` : `appel accepté, aucune donnée de Léa (${JSON.stringify(data).slice(0, 40)})`, f, note ?? '');
  }
  if (oracle) sql(`delete from public.demandes_effacement where user_id = '${A.id}' or child_id = '${L}'`);
}
// Les fonctions de tâche ne doivent pas avoir eu d'effet : rien n'a été supprimé / créé
const apres = {
  enfant: sql(`select count(*) from public.children where id = '${L}'`),
  fils: sql(`select count(*) from public.teacher_conversations where student_id = '${L}' and teacher_id <> '${TE.id}'`),
  mot_carnets: sql(`select count(*) from public.mot_carnets where mot_id = '${M}'`),
};
noter('contrôle après les appels RPC', 'ÉTAT', 'B/T0/ANON', `enfant présent: ${apres.enfant}, fils intrus: ${apres.fils}, copies du mot: ${apres.mot_carnets}`, apres.enfant !== '1' || apres.fils !== '0');

// ── Injection d'un mot dans une classe qui n'est pas la sienne (classe de Léa) ──
for (const a of ['B', 'T0'] as Acteur[]) {
  const { error } = await clients[a].from('mots_liaison').insert({ teacher_id: (a === 'B' ? B : T0).id, classe_id: K, type: 'information', titre: 'MOT INTRUS', contenu: 'x', statut: 'envoyé' });
  const copies = sql(`select count(*) from public.mot_carnets mc join public.mots_liaison m on m.id = mc.mot_id where m.titre = 'MOT INTRUS'`);
  noter('mots_liaison → mot_carnets', 'INJECTION mot envoyé à la classe d\'un autre', a, error ? `refusé (${error.code})` : `ÉCRIT (copies distribuées: ${copies})`, !error || copies !== '0');
}
// Enseignant non rattaché : lit / écrit sur des enfants ?
{
  const { data } = await T0.client.from('children').select('id');
  noter('children', 'SELECT (tout)', 'T0', `${data?.length ?? 0} enfant(s) visible(s)`, (data?.length ?? 0) > 0);
  const { data: d2 } = await TE.client.from('children').select('id');
  noter('children', 'SELECT (tout)', 'TE', `${d2?.length ?? 0} enfant(s) visible(s) (titulaire : l'accès aux enfants passe par les fils et les mots, pas par la fiche)`, (d2?.length ?? 0) > 0);
}

// ── Stockage : bucket « carnet » ──
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const nomFichier = `${L}/${Y}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
const upA = await A.client.storage.from('carnet').upload(nomFichier, jpeg, { contentType: 'image/jpeg' });
noter('storage carnet', 'DÉPÔT par le propriétaire (A)', 'A', upA.error ? `refusé: ${upA.error.message}` : 'accepté', !!upA.error, 'attendu : accepté');
for (const a of ['B', 'T0', 'ANON'] as Acteur[]) {
  const c = clients[a];
  const lien = await c.storage.from('carnet').createSignedUrl(nomFichier, 60);
  noter('storage carnet', 'LECTURE (URL signée) du fichier de A', a, lien.error ? 'refusé' : 'OBTIENT une URL', !lien.error);
  const dl = await c.storage.from('carnet').download(nomFichier);
  noter('storage carnet', 'TÉLÉCHARGEMENT du fichier de A', a, dl.error ? 'refusé' : 'TÉLÉCHARGE', !dl.error);
  const lst = await c.storage.from('carnet').list(L);
  noter('storage carnet', 'LISTE du dossier de Léa', a, lst.error ? 'refusé' : `${lst.data?.length ?? 0} entrée(s)`, (lst.data?.length ?? 0) > 0);
  const dep = await c.storage.from('carnet').upload(`${L}/${Y}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`, jpeg, { contentType: 'image/jpeg' });
  noter('storage carnet', 'DÉPÔT sous le dossier de Léa', a, dep.error ? 'refusé' : 'ÉCRIT', !dep.error);
  const sup = await c.storage.from('carnet').remove([nomFichier]);
  const reste = sql(`select count(*) from storage.objects where name = '${nomFichier}'`) === '1';
  noter('storage carnet', 'SUPPRESSION du fichier de A', a, reste ? 'refusé / sans effet' : 'SUPPRIME', !reste);
  if (!reste) await A.client.storage.from('carnet').upload(nomFichier, jpeg, { contentType: 'image/jpeg' });
  void sup;
}
// Types et taille (par le propriétaire A, sous son enfant)
const essai = async (nom: string, octets: Uint8Array, type: string) => A.client.storage.from('carnet').upload(`${L}/${Y}/${nom}`, octets, { contentType: type });
const e1 = await essai('cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg', jpeg, 'text/html');
noter('storage carnet', 'DÉPÔT type MIME text/html (extension .jpg)', 'A', e1.error ? 'refusé' : 'ACCEPTÉ', !e1.error);
const e2 = await essai('dddddddd-dddd-4ddd-8ddd-dddddddddddd.exe', jpeg, 'image/jpeg');
noter('storage carnet', 'DÉPÔT extension .exe', 'A', e2.error ? 'refusé' : 'ACCEPTÉ', !e2.error);
const e3 = await essai('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg', new Uint8Array(11 * 1024 * 1024), 'image/jpeg');
noter('storage carnet', 'DÉPÔT de 11 Mo (limite annoncée : 10 Mo)', 'A', e3.error ? 'refusé' : 'ACCEPTÉ', !e3.error);
const e4 = await essai('ffffffff-ffff-4fff-8fff-ffffffffffff.pdf', new TextEncoder().encode('<html><script>alert(1)</script></html>'), 'application/pdf');
noter('storage carnet', 'DÉPÔT d\'un contenu HTML déclaré application/pdf', 'A', e4.error ? 'refusé' : 'ACCEPTÉ (le contenu n\'est pas inspecté)', false, 'signalé, pas une faille d\'accès : le bucket est privé, les fichiers sont servis par URL signée');
const e5 = await A.client.storage.from('carnet').upload(`${L}/${Y}/../../x/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab.jpg`, jpeg, { contentType: 'image/jpeg' });
noter('storage carnet', 'DÉPÔT avec chemin « ../ »', 'A', e5.error ? 'refusé' : 'ACCEPTÉ', !e5.error);
const e6 = await A.client.storage.from('autre-bucket').upload('x.jpg', jpeg, { contentType: 'image/jpeg' });
noter('storage', 'DÉPÔT dans un bucket inexistant', 'A', e6.error ? 'refusé' : 'ACCEPTÉ', !e6.error);
const bk = await B.client.storage.listBuckets();
noter('storage', 'LISTE des buckets', 'B', bk.error ? 'refusé' : `${bk.data?.length ?? 0} bucket(s) visibles`, false);

// ── Colonnes modifiables par le propriétaire de ses propres données (altération de champs sensibles) ──
type Col = [string, string, string, Record<string, unknown>, string];
const colonnes: Col[] = [
  ['profiles', A.id, 'role', { role: 'enseignant' }, 'le rôle ne doit pas être modifiable'],
  ['profiles', A.id, 'plan', { plan: 'premium' }, 'le forfait ne doit pas être modifiable par l\'utilisateur'],
  ['profiles', A.id, 'email', { email: 'autre@exemple.test' }, 'adresse affichée du profil'],
  ['children', L, 'parent_id', { parent_id: B.id }, 'créateur de la fiche (FK en cascade)'],
  ['children', L, 'scolaria_id', { scolaria_id: 'FAUX-ID' }, 'identifiant public de l\'enfant'],
  ['agenda_events', ids.agenda_events, 'parent_id', { parent_id: B.id }, 'auteur d\'un événement'],
  ['carnet_items', ids.carnet_items, 'ajoute_par', { ajoute_par: B.id }, 'auteur d\'un ajout'],
  ['carnet_items', ids.carnet_items, 'child_id', { child_id: ZOE }, 'déplacer un ajout vers un autre enfant'],
  ['competences', ids.competences, 'source', { source: 'parent' }, 'origine d\'une compétence'],
  ['absences', ids.absences, 'signalee_par', { signalee_par: B.id }, 'auteur d\'un signalement'],
  ['messages', ids.messages, 'sender_id', { sender_id: B.id }, 'expéditeur d\'un message'],
  ['signatures', ids.signatures, 'parent_name', { parent_name: 'FAUX' }, 'nom du signataire'],
  ['signatures', ids.signatures, 'signed_at', { signed_at: '2000-01-01T00:00:00Z' }, 'date de signature'],
  ['reponses_mot', ids.reponses_mot, 'responsable_id', { responsable_id: B.id }, 'auteur d\'une réponse'],
  ['academic_years', Y, 'classe_id', { classe_id: null }, 'rattachement à la classe'],
  ['academic_years', Y, 'statut', { statut: 'archivee' }, 'statut de l\'année'],
  ['foyers', F, 'created_by', { created_by: B.id }, 'créateur du foyer'],
  ['invitations_responsable', ids.invitations_responsable, 'statut', { statut: 'acceptee' }, 'statut d\'une invitation'],
  ['invitations_responsable', ids.invitations_responsable, 'expires_at', { expires_at: '2099-01-01T00:00:00Z' }, 'expiration d\'une invitation'],
  ['teacher_messages', ids.teacher_messages, 'sender_id', { sender_id: B.id }, 'auteur d\'un message de fil (parent)'],
];
for (const [table, id, col, patch, pourquoi] of colonnes) {
  const avant = valeur(table, id, col);
  const { error } = await A.client.from(table).update(patch).eq('id', id);
  const apres2 = valeur(table, id, col);
  const change = apres2 !== avant;
  noter(`colonne ${table}.${col}`, 'UPDATE par le propriétaire', 'A', change ? `MODIFIABLE (${pourquoi})` : `verrouillée${error ? ' (' + (error.code ?? '') + ')' : ''}`, change, pourquoi);
  if (change) sql(`update public.${table} set ${col} = ${avant === '' ? 'NULL' : `'${avant.replace(/'/g, "''")}'`} where id = '${id}'`);
}
// Invitation : expires_at à l'insertion (colonne libre ?) — on MESURE la valeur enregistrée
{
  const { error } = await A.client.from('invitations_responsable').insert({ child_id: L, invited_by: A.id, invited_email: 'longue@exemple.test', expires_at: '2099-01-01T00:00:00Z' });
  const jours = Number(sql(`select round(extract(epoch from (expires_at - now())) / 86400) from public.invitations_responsable where invited_email = 'longue@exemple.test'`));
  noter('colonne invitations_responsable.expires_at', 'INSERT avec expiration 2099', 'A', error ? 'refusé' : jours > 8 ? `ACCEPTÉ : l'invitation expire dans ${jours} jours` : `accepté, mais expiration forcée par le serveur à ${jours} jours`, !error && jours > 8, 'durée de validité normale : 7 jours');
}

// ── Résultats d'abord, nettoyage ensuite ──
const ecarts = R.filter((r) => r.ecart);
writeFileSync('scripts/audit-securite-resultats.json', JSON.stringify(R, null, 1));
console.log(`${R.length} tests, ${ecarts.length} écart(s)`);
for (const e of ecarts) console.log(`ÉCART  ${e.table} / ${e.operation} / ${e.acteur} : ${e.resultat}${e.detail ? ' — ' + e.detail : ''}`);
try {
  sql(`delete from public.class_posts where classe_id = '${K}'; delete from public.class_events where classe_id = '${K}'; delete from public.mots_liaison where classe_id = '${K}' or teacher_id in ('${TE.id}','${T0.id}','${B.id}');
       update public.academic_years set classe_id = null where classe_id = '${K}'; delete from public.classes where id = '${K}'; delete from public.ecoles where id = '${E}'`);
  sql(`delete from public.demandes_effacement where user_id in ('${A.id}','${Z.id}'); delete from public.departs_foyer where user_id = '${Z.id}'`);
  for (const u of [A, B, Z, T0, TE]) await admin.auth.admin.deleteUser(u.id);
} catch (e) {
  console.log('nettoyage partiel :', String(e).slice(0, 200));
}
process.exitCode = 0;
