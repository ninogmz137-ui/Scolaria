// Essai de bout en bout du lot 4b (absence signalée, justificatif par FOYER) contre le Supabase LOCAL (jamais la
// production), avec les MÊMES appels que l'app (src/services/absenceService.ts, utils/absences.fusionnerAbsences)
// et l'API Storage réelle, sous RLS :
//   parent-3b (Sophie) et coparent-3b (Marc) : responsables de Lina, MÊME foyer ;
//   separe-3b (Julien) : responsable de Lina dans un AUTRE foyer (parent séparé) ;
//   parent2-3b (Karim) : parent de Tom, MÊME classe que Lina ;
//   enseignant-3b (Claire Martin) : titulaire de la classe de Lina ;
//   enseignant2-4b (Paul Durand) : titulaire d'une AUTRE classe de la MÊME école.
// Règle (20 nov. 2026) : tout responsable du foyer de l'auteur voit « À justifier » et peut joindre le justificatif ;
// hors foyer : la carte « Absence » seulement, ni justificatif, ni « À justifier ».
// Usage : node scripts/seed-lot3b-local.mjs && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-lot4b-local.mjs
//         && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-lot4b-local.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { exigerHoteLocal } from './garde-hote.mjs';
import { demainParis, decalerJour, aujourdhuiParis } from '../src/utils/jourParis.ts';
import { aJustifier, couvreJour, fusionnerAbsences, peutJustifier } from '../src/utils/absences.ts';

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
const PDF = new TextEncoder().encode('%PDF-1.4\n% justificatif de test lot 4b\n%%EOF\n');
const COLONNES = 'id, student_id, date_debut, date_fin, demi_journee, motif, commentaire, signalee_par, created_at';
const DEPUIS = decalerJour(aujourdhuiParis(), -30);

// ─── Mêmes appels que absenceService ─────────────────────────────────────────────────────────────────────────
async function deposer(c, childId) {
  const { data: an } = await c.from('academic_years').select('id').eq('student_id', childId).eq('statut', 'active').maybeSingle();
  const chemin = `${childId}/${an?.id}/${randomUUID()}.pdf`;
  const { error } = await c.storage.from('carnet').upload(chemin, PDF, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`dépôt : ${error.message}`);
  return chemin;
}
const joindre = async (c, moi, absenceId, chemin) =>
  c.from('absences_justificatifs').upsert({ absence_id: absenceId, chemin, depose_par: moi }, { onConflict: 'absence_id' }).select('absence_id');
async function chargerAbsences(c, moi, childId) {
  const [lignes, resp] = await Promise.all([
    c.from('absences').select(COLONNES).eq('student_id', childId).order('date_debut', { ascending: false }),
    c.from('responsables').select('user_id, foyer_id').eq('child_id', childId),
  ]);
  const ids = (lignes.data ?? []).map((a) => a.id);
  const { data: justifs } = ids.length ? await c.from('absences_justificatifs').select('absence_id, chemin').in('absence_id', ids) : { data: [] };
  return fusionnerAbsences(lignes.data ?? [], justifs ?? [], resp.data ?? [], moi);
}
async function lireFichier(c, chemin) {
  const { data, error } = await c.storage.from('carnet').createSignedUrl(chemin, 3600);
  if (error || !data?.signedUrl) return { lu: false, raison: error?.message ?? 'pas d’URL' };
  const r = await fetch(data.signedUrl);
  const octets = new Uint8Array(await r.arrayBuffer());
  return { lu: r.ok && octets.length === PDF.length, raison: `HTTP ${r.status}` };
}

const { c: sophie, moi: idSophie } = await connecter('parent-3b@exemple.test');
const { c: marc, moi: idMarc } = await connecter('coparent-3b@exemple.test');
const { c: julien, moi: idJulien } = await connecter('separe-3b@exemple.test');
const { c: karim, moi: idKarim } = await connecter('parent2-3b@exemple.test');
const { c: titulaire } = await connecter('enseignant-3b@exemple.test');
const { c: autreEnseignant } = await connecter('enseignant2-4b@exemple.test');
const { data: rs } = await sophie.from('responsables').select('child_id').eq('user_id', idSophie);
const lina = rs[0].child_id;
const { data: rk } = await karim.from('responsables').select('child_id').eq('user_id', idKarim);
const tom = rk[0].child_id;
// Aucune règle de suppression des absences pour un compte : remise à zéro par le compte de service LOCAL.
const admin = createClient(statut.API_URL, statut.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await admin.from('absences').delete().eq('student_id', lina);
const { data: supprSophie } = await sophie.from('absences').delete().eq('student_id', lina).select('id');
verifier('un parent ne peut pas supprimer une absence', (supprSophie ?? []).length === 0);

// 1. Sophie signale une absence (rendez-vous, trois jours), sans justificatif.
const debut = demainParis();
const fin = decalerJour(debut, 2);
const { data: abs, error: eAbs } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: debut, date_fin: fin, demi_journee: 'journee', motif: 'rendez_vous',
  commentaire: null, statut: 'signalée', signalee_par: idSophie,
}).select('id').single();
verifier('Sophie signale une absence « rendez-vous » de trois jours', !eAbs && !!abs, eAbs?.message);
const vueSophie = (await chargerAbsences(sophie, idSophie, lina)).find((a) => a.id === abs.id);
verifier('l’absence couvre ses trois jours', couvreJour(vueSophie, debut) && couvreJour(vueSophie, fin) && !couvreJour(vueSophie, decalerJour(fin, 1)));

// 2. « À justifier » : Sophie et Marc (même foyer) oui ; Julien (autre foyer) non.
const vueMarc = await chargerAbsences(marc, idMarc, lina);
const vueJulien = await chargerAbsences(julien, idJulien, lina);
verifier('Sophie voit « À justifier »', aJustifier(await chargerAbsences(sophie, idSophie, lina), DEPUIS).some((a) => a.id === abs.id));
verifier('Marc (même foyer) voit « À justifier » pour l’absence signalée par Sophie', aJustifier(vueMarc, DEPUIS).some((a) => a.id === abs.id));
verifier('Julien (autre foyer) voit la carte « Absence »', vueJulien.some((a) => a.id === abs.id && couvreJour(a, debut)));
verifier('Julien (autre foyer) ne voit pas « À justifier »', !aJustifier(vueJulien, DEPUIS).some((a) => a.id === abs.id));

// 3. Julien ne peut pas joindre ; Marc joint le justificatif de l'absence signalée par Sophie.
const cheminJulien = await deposer(julien, lina);
const { data: parJulien, error: eJulien } = await joindre(julien, idJulien, abs.id, cheminJulien);
verifier('Julien (autre foyer) ne peut pas joindre de justificatif', !!eJulien || (parJulien ?? []).length === 0, 'accepté');
const cheminMarc = await deposer(marc, lina);
const { error: eMarc } = await joindre(marc, idMarc, abs.id, cheminMarc);
verifier('Marc (même foyer) joint le justificatif de l’absence signalée par Sophie', !eMarc, eMarc?.message);

// 4. Après le justificatif : visible dans le foyer et par le titulaire ; jamais ailleurs.
const sophieApres = (await chargerAbsences(sophie, idSophie, lina)).find((a) => a.id === abs.id);
verifier('Sophie : justificatif visible, plus « À justifier »', sophieApres?.justificatif_path === cheminMarc && !peutJustifier(sophieApres));
verifier('Sophie télécharge le justificatif joint par Marc', (await lireFichier(sophie, cheminMarc)).lu);
const julienApres = (await chargerAbsences(julien, idJulien, lina)).find((a) => a.id === abs.id);
verifier('Julien : l’absence, SANS le justificatif (masqué par la base)', !!julienApres && julienApres.justificatif_path === null);
const lecJ = await lireFichier(julien, cheminMarc);
verifier('Julien : fichier du justificatif REFUSÉ', !lecJ.lu, lecJ.raison);
const lecT = await lireFichier(titulaire, cheminMarc);
const { data: justT } = await titulaire.from('absences_justificatifs').select('chemin').eq('absence_id', abs.id);
verifier('le titulaire voit l’absence et son justificatif', ((await titulaire.from('absences').select('id').eq('id', abs.id)).data ?? []).length === 1 && (justT ?? []).length === 1);
verifier('le titulaire télécharge le justificatif (URL signée)', lecT.lu, lecT.raison);
const lecT2 = await lireFichier(autreEnseignant, cheminMarc);
verifier('autre enseignant de l’école : absence invisible', ((await autreEnseignant.from('absences').select('id').eq('id', abs.id)).data ?? []).length === 0);
verifier('autre enseignant de l’école : justificatif REFUSÉ', !lecT2.lu, lecT2.raison);
const lecK = await lireFichier(karim, cheminMarc);
verifier('parent d’un autre enfant : absence invisible', ((await karim.from('absences').select('id').eq('id', abs.id)).data ?? []).length === 0);
verifier('parent d’un autre enfant : justificatif REFUSÉ', !lecK.lu, lecK.raison);

// 5. L'enseignant ne modifie rien ; motifs ; falsifications.
const { data: modT } = await titulaire.from('absences').update({ statut: 'prise_en_compte' }).eq('id', abs.id).select('id');
verifier('le titulaire ne peut rien modifier', (modT ?? []).length === 0);
const { error: eVac } = await sophie.from('absences').insert({ student_id: lina, motif: 'vacances', signalee_par: idSophie });
verifier('motif hors liste refusé', !!eVac);
const { data: abs2 } = await sophie.from('absences').insert({
  student_id: lina, student_name: 'Lina', date_debut: aujourdhuiParis(), demi_journee: 'matin', motif: 'maladie', signalee_par: idSophie,
}).select('id').single();
const cheminTom = await deposer(karim, tom);
const { error: eTom } = await joindre(sophie, idSophie, abs2.id, cheminTom);
verifier('le fichier d’un autre enfant ne peut pas servir de justificatif', !!eTom);
const { error: eAutre } = await joindre(sophie, idSophie, abs2.id, cheminMarc);
verifier('un fichier déposé par un autre compte ne peut pas être joint en mon nom', !!eAutre);

// Nettoyage.
await admin.from('absences').delete().eq('student_id', lina);
await julien.storage.from('carnet').remove([cheminJulien]);
await marc.storage.from('carnet').remove([cheminMarc]);
await karim.storage.from('carnet').remove([cheminTom]);

console.log(`\nLot 4b local : ${ok} OK, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
