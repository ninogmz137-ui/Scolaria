// « Carnet vide » sur le Supabase LOCAL (jamais la production), avec un VRAI compte parent : les 9 tables du carnet sont
// lisibles (aucune ne refuse la lecture, sinon la phrase « vide » ne s'afficherait jamais), un carnet neuf compte 0 partout,
// un seul souvenir suffit à le rendre « non vide », et deux enfants ne se mélangent pas.
// Prérequis : `npx supabase start`.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { TABLES_CARNET, carnetEstVide, type ComptesCarnet } from '../src/utils/carnetVide.ts';
import { exigerHoteLocal } from './garde-hote.mjs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q: string) =>
  execSync('docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q, encoding: 'utf8' }).trim();

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'OK ' : 'ÉCHEC'} ${nom}${cond ? '' : ` ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const email = `vide-${Date.now()}@exemple.test`;
const mdp = 'Carnet-test-2026!';
const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, user_metadata: { role: 'parent' } });
if (eu) throw new Error(eu.message);
try {
  const A = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  await A.auth.signInWithPassword({ email, password: mdp });
  const creer = async (prenom: string) => {
    const { data, error } = await A.rpc('create_child', { p_first_name: prenom, p_last_name: 'T', p_birth_date: null, p_age: 7, p_classe: 'CE1', p_school: 'École test' });
    if (error) throw new Error(error.message);
    return ((data as any)?.id ?? (data as any)?.[0]?.id) as string;
  };
  // Même requête que le hook useCarnetVide.
  const compter = async (childId: string): Promise<ComptesCarnet> => {
    const lectures = await Promise.all(
      TABLES_CARNET.map(async ({ table, colonne }) => {
        const { count, error } = await A.from(table).select('*', { count: 'exact', head: true }).eq(colonne, childId);
        return [table, error || count === null ? null : count] as const;
      }),
    );
    return Object.fromEntries(lectures);
  };

  const lucas = await creer('Lucas');
  const lea = await creer('Léa');

  const c1 = await compter(lucas);
  const illisibles = Object.entries(c1).filter(([, n]) => n === null).map(([t]) => t);
  verifier('les 9 tables du carnet sont LISIBLES par un compte parent (aucune erreur)', illisibles.length === 0, illisibles.join(', '));
  verifier('carnet neuf : 0 partout', Object.values(c1).every((n) => n === 0), JSON.stringify(c1));
  verifier('carnet neuf → « vide »', carnetEstVide({ childId: lucas, comptes: c1 }, lucas, false));

  // Un seul souvenir
  const { error: ei } = await A.from('carnet_items').insert({ child_id: lucas, categorie: 'souvenir', titre: 'Dessin', ajoute_par: u.user!.id });
  verifier('A ajoute un seul souvenir', !ei, ei?.message ?? '');
  const c2 = await compter(lucas);
  verifier('un seul souvenir : carnet_items = 1', c2.carnet_items === 1, JSON.stringify(c2));
  verifier('un seul souvenir → PAS « vide »', !carnetEstVide({ childId: lucas, comptes: c2 }, lucas, false));

  // Autres contenus que l'Accueil n'affiche pas forcément : un événement lointain
  const lointain = new Date(Date.now() + 200 * 86400000).toISOString();
  const { error: ev } = await A.from('agenda_events').insert({ child_id: lea, parent_id: u.user!.id, title: 'Sortie lointaine', event_type: 'sortie', start_time: lointain });
  verifier('A ajoute un événement à 200 jours (hors des 7 jours de l\'Accueil)', !ev, ev?.message ?? '');
  const c3 = await compter(lea);
  verifier('événement lointain : agenda_events = 1 → PAS « vide » (l\'Accueil ne l\'affiche pas, la phrase serait fausse)', c3.agenda_events === 1 && !carnetEstVide({ childId: lea, comptes: c3 }, lea, false), JSON.stringify(c3));

  // Deux enfants ne se mélangent pas
  const cLucas = await compter(lucas);
  verifier('les deux enfants sont comptés séparément (Lucas : 1 souvenir, 0 événement)', cLucas.carnet_items === 1 && cLucas.agenda_events === 0);
  const cLea = await compter(lea);
  verifier('Léa : 0 souvenir, 1 événement', cLea.carnet_items === 0 && cLea.agenda_events === 1);

  // Erreur de chargement : la règle du hook (erreur OU count null → null) ne laisse jamais passer « vide ».
  // (Constaté en local : une table inconnue répond 204 SANS erreur et SANS compte ; une colonne inconnue répond 400.)
  const lecture = (r: { count: number | null; error: unknown }) => (r.error || r.count === null ? null : r.count);
  const rTable = await A.from('table_inexistante').select('*', { count: 'exact', head: true }).eq('child_id', lucas);
  const rColonne = await A.from('carnet_items').select('*', { count: 'exact', head: true }).eq('colonne_inconnue', lucas);
  verifier('table inconnue (204 sans compte) → lecture null', lecture(rTable) === null);
  verifier('colonne inconnue (400) → lecture null', lecture(rColonne) === null);
  verifier('une lecture null → jamais « vide »', !carnetEstVide({ childId: lucas, comptes: { ...zerosDe(), carnet_items: lecture(rTable) } }, lucas, false));
  // Sans session : RLS → 0 ligne visible : le hook n'est jamais lancé sans enfant ; on vérifie que l'anonyme ne voit rien
  const anon = createClient(statut.API_URL, statut.ANON_KEY, { auth: { persistSession: false } });
  const { count: cAnon } = await anon.from('carnet_items').select('*', { count: 'exact', head: true }).eq('child_id', lucas);
  verifier('anonyme : aucune ligne visible (la phrase « vide » n\'a de sens que connecté)', (cAnon ?? 0) === 0);
} finally {
  sql(`delete from public.children where id in (select child_id from public.responsables where user_id = '${u.user!.id}')`);
  await admin.auth.admin.deleteUser(u.user!.id);
}
function zerosDe(): ComptesCarnet {
  return Object.fromEntries(TABLES_CARNET.map((t) => [t.table, 0]));
}
console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
