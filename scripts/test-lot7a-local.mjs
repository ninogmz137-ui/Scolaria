// Essai de bout en bout des notifications (lot 7a) contre le Supabase LOCAL (jamais la production), en ENVOI SIMULÉ :
// la fonction envoyer-notifications est servie en local SANS jeton Expo (`npx supabase@3.2.0 functions serve
// envoyer-notifications --no-verify-jwt`) : rien ne part vers Expo, la réponse contient les textes préparés.
// Comptes de test (scripts/seed-lot3b-local.mjs, jamais recréés ici) : parent-3b (Sophie) et coparent-3b (Marc), même
// foyer ; separe-3b (Julien), autre foyer ; enseignant-3b (Claire Martin), titulaire de la classe de Lina.
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot7a-local.mjs
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
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function appeler(corps, cle = statut.SERVICE_ROLE_KEY) {
  const r = await fetch(`${statut.API_URL}/functions/v1/envoyer-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    body: JSON.stringify(corps),
  });
  return { status: r.status, corps: await r.json().catch(() => ({})) };
}

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc, moi: idMarc } = await connecter('coparent-3b@exemple.test');
const { moi: idJulien } = await connecter('separe-3b@exemple.test');
const { moi: idClaire } = await connecter('enseignant-3b@exemple.test');
const { data: rs } = await sophie.from('responsables').select('child_id, children(first_name)').eq('user_id', idSophie);
const lina = rs.find((r) => r.children?.first_name === 'Lina')?.child_id;
const { data: an } = await admin.from('academic_years').select('classe_id').eq('student_id', lina).eq('statut', 'active').single();

// Remise à zéro : file, résumés, téléphones et réglages des comptes d'essai (base LOCALE).
await admin.from('notifications_file').delete().in('destinataire', [idSophie, idMarc, idJulien]);
await admin.from('notifications_resumes').delete().in('user_id', [idSophie, idMarc, idJulien]);
await admin.from('appareils_push').delete().in('user_id', [idSophie, idMarc, idJulien]);
await admin.from('preferences_notifications').delete().in('user_id', [idSophie, idMarc, idJulien]);

// 1. Appel sans clé de service : refusé.
const anonyme = await appeler({ mode: 'file' }, statut.ANON_KEY);
verifier('appel sans clé de service : 401, rien fait', anonyme.status === 401, String(anonyme.status));

// 2. Téléphones : Sophie (deux), Marc (un), Julien (aucun). Inscription comme l'app (sous RLS).
await sophie.from('appareils_push').insert([
  { user_id: idSophie, jeton: 'ExponentPushToken[essai-sophie-1]', plateforme: 'android' },
  { user_id: idSophie, jeton: 'ExponentPushToken[essai-sophie-2]', plateforme: 'ios' },
]);
await marc.from('appareils_push').insert({ user_id: idMarc, jeton: 'ExponentPushToken[essai-marc]', plateforme: 'android' });
// Marc coupe les notifications essentielles.
await marc.from('preferences_notifications').upsert({ user_id: idMarc, essentielles: false });

// 3. L'enseignante envoie un mot à la classe (distribué au carnet de Lina par la base) et un message dans le fil du foyer.
const { data: mot } = await admin.from('mots_liaison').insert({
  teacher_id: idClaire, type: 'signature', titre: 'Essai 7a', contenu: 'Texte privé', statut: 'envoyé', classe_id: an.classe_id, signature_mode: 'one',
}).select('id').single();
const { count: nFile } = await admin.from('notifications_file').select('id', { count: 'exact', head: true }).eq('ref_id', mot.id).eq('child_id', lina);
verifier('mot → une ligne par responsable de Lina (Sophie, Marc, Julien)', nFile === 3, String(nFile));
const { count: nTom } = await admin.from('notifications_file').select('id', { count: 'exact', head: true }).eq('ref_id', mot.id).neq('child_id', lina);
verifier('les autres enfants de la classe ont leur propre ligne (carnet de Tom)', (nTom ?? 0) >= 1, String(nTom));

// 4. Envoi (simulé), à une heure où tout est dû (après 7 h le lendemain, pour ignorer le silence de la nuit).
const demain7h = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
const envoi = await appeler({ mode: 'file', maintenant: demain7h });
verifier('envoi simulé : 200', envoi.status === 200 && envoi.corps.simule === true, JSON.stringify(envoi.corps));
const apercu = envoi.corps.apercu ?? [];
verifier('une notification préparée (Sophie ; Marc a coupé ; Julien sans téléphone)', apercu.length === 1, JSON.stringify(apercu));
verifier('texte exact « Lina · Nouveau mot de Claire Martin »', apercu[0]?.corps === 'Lina · Nouveau mot de Claire Martin', apercu[0]?.corps);
verifier('envoyée aux deux téléphones de Sophie', apercu[0]?.telephones === 2 && envoi.corps.messages === 2, JSON.stringify(envoi.corps));
verifier('aucun jeton dans la réponse', !JSON.stringify(envoi.corps).includes('ExponentPushToken'));
verifier('aucun contenu (« Texte privé ») dans la réponse', !JSON.stringify(envoi.corps).includes('Texte privé'));
const { data: marques } = await admin.from('notifications_file').select('destinataire, resultat').eq('ref_id', mot.id);
const res = Object.fromEntries((marques ?? []).map((m) => [m.destinataire, m.resultat]));
verifier('marquage : Sophie « simule », Marc « coupe », Julien « sans_appareil »',
  res[idSophie] === 'simule' && res[idMarc] === 'coupe' && res[idJulien] === 'sans_appareil', JSON.stringify(res));
const second = await appeler({ mode: 'file', maintenant: demain7h });
verifier('deuxième passage : rien à renvoyer', (second.corps.notifications ?? 0) === 0, JSON.stringify(second.corps));

// 5. Résumé de 18 h (simulé) : Lina a au moins ce mot à signer → une notification pour Sophie ; rien à 17 h.
const d = new Date(Date.now() + 24 * 3600 * 1000);
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const a18h = new Date(`${jour}T18:05:00+01:00`).toISOString();
const a17h = new Date(`${jour}T17:05:00+01:00`).toISOString();
const r17 = await appeler({ mode: 'resume', maintenant: a17h });
verifier('résumé à 17 h (heure de Paris) : rien', (r17.corps.notifications ?? 0) === 0, JSON.stringify(r17.corps));
const r18 = await appeler({ mode: 'resume', maintenant: a18h });
const lignesResume = (r18.corps.apercu ?? []).map((x) => x.corps);
verifier('résumé à 18 h : « Lina · … mot… à traiter … »', lignesResume.some((t) => /^Lina · \d+ mots? à traiter/.test(t)), JSON.stringify(lignesResume));
verifier('résumé : Marc aussi (réglages indépendants : essentielles coupé, résumé gardé)', (r18.corps.apercu ?? []).length >= 2, JSON.stringify(r18.corps));
const r18bis = await appeler({ mode: 'resume', maintenant: a18h });
verifier('résumé : une seule fois par jour', (r18bis.corps.notifications ?? 0) === 0, JSON.stringify(r18bis.corps));

// 6. Déconnexion de Sophie sur un téléphone : sa ligne disparaît (comme l'app).
await sophie.from('appareils_push').delete().eq('jeton', 'ExponentPushToken[essai-sophie-2]');
const { count: nTel } = await admin.from('appareils_push').select('id', { count: 'exact', head: true }).eq('user_id', idSophie);
verifier('déconnexion : un téléphone de moins', nTel === 1, String(nTel));

// Nettoyage (compte de service LOCAL).
await admin.from('notifications_file').delete().eq('ref_id', mot.id);
await admin.from('mots_liaison').delete().eq('id', mot.id);
await admin.from('notifications_file').delete().in('destinataire', [idSophie, idMarc, idJulien]);
await admin.from('notifications_resumes').delete().in('user_id', [idSophie, idMarc, idJulien]);
await admin.from('appareils_push').delete().in('user_id', [idSophie, idMarc, idJulien]);
await admin.from('preferences_notifications').delete().in('user_id', [idSophie, idMarc, idJulien]);

console.log(`\n${ok} OK, ${echecs} échec(s)`);
if (echecs) process.exit(1);
