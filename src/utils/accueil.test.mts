// npm run test:accueil — contenu de l'Accueil (lot 6).
import { aujourdhuiEtDemain, lignesAFaire, suggestionAccueil, type MotAccueil } from './accueil.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}

type M = MotAccueil & { aRepondre: boolean; aFaire: boolean };
const base = { expediteur: 'Mme Durand', echeance: null, type: 'signature', maReponse: null, lu: true, responsables: [], aPrevoir: [], aRepondre: false, aFaire: false };
const mots: M[] = [
  { ...base, id: 'a', titre: 'Sortie au musée', echeance: '2026-11-25', aFaire: true, responsables: [{ prenom: 'Marc', estMoi: false, aSigne: true }, { prenom: 'Sophie', estMoi: true, aSigne: false }] },
  { ...base, id: 'b', titre: 'Autorisation photo', type: 'autorisation', aFaire: true, aRepondre: true },
  { ...base, id: 'c', titre: 'Kermesse', type: 'participation', aFaire: true, aRepondre: true, echeance: '2026-11-23' },
  { ...base, id: 'd', titre: 'Menu de la cantine', type: 'information', lu: false },
  { ...base, id: 'e', titre: 'Info lue', type: 'information', lu: true },
];
const jourCourt = (iso: string) => ({ '2026-11-23': 'lun. 23 nov.', '2026-11-25': 'mer. 25 nov.' } as Record<string, string>)[iso] ?? iso;
const lignes = lignesAFaire({
  mots,
  absencesAJustifier: [{ id: 'abs1', periode: 'Hier, journée' }],
  aTraiter: (m) => m.aFaire,
  attendReponse: (m) => m.aRepondre,
  jourCourt,
});
verifier('ordre : Justifier, puis mots par échéance, puis Lire', lignes.map((l) => l.etiquette).join(',') === 'Justifier,Répondre,Signer,Autoriser,Lire', lignes.map((l) => l.etiquette));
verifier('« avant le mer. 25 nov. · Marc a signé »', lignes.find((l) => l.motId === 'a')?.sousTitre === 'avant le mer. 25 nov. · Marc a signé', lignes.find((l) => l.motId === 'a'));
verifier('autorisation sans réponse : « Autoriser »', lignes.find((l) => l.motId === 'b')?.etiquette === 'Autoriser');
verifier('sans échéance ni signature : l’expéditeur', lignes.find((l) => l.motId === 'b')?.sousTitre === 'Mme Durand');
verifier('mot d’information non lu : « Lire »', lignes.find((l) => l.motId === 'd')?.etiquette === 'Lire');
verifier('mot lu sans action : absent', !lignes.some((l) => l.motId === 'e'));
verifier('absence : ouvre la page d’absence', lignes[0].absenceId === 'abs1' && lignes[0].titre === 'Absence à justifier');

const auj = '2026-11-22';
const dem = '2026-11-23';
const quand = (d: string) => (d === auj ? 'Aujourd’hui' : d === dem ? 'Demain' : d);
const heure = (h: string) => `${Number(h.slice(0, 2))}h${h.slice(3) === '00' ? '' : h.slice(3)}`;
const elements = aujourdhuiEtDemain({
  evenements: [
    { id: 'e1', titre: 'Sortie au zoo', type: 'sortie', date: dem, debut: '08:30', fait: false },
    { id: 'e2', titre: 'Réunion parents', type: 'reunion', date: auj, debut: '18:00', fait: false, lieu: 'Salle 3' },
    { id: 'c1', titre: 'Maths', type: 'cours', date: auj, debut: '09:00', fait: false },
    { id: 'd1', titre: 'Tables de 7', type: 'devoir', date: dem, debut: '00:00', matiere: 'Mathématiques', fait: false },
    { id: 'x1', titre: 'Plus tard', type: 'sortie', date: '2026-11-26', debut: '09:00', fait: false },
  ],
  mots: [{ ...base, id: 'm1', titre: 'Sortie au zoo', aPrevoir: ['Casquette', 'Gourde'], evenement: { id: 'e1', titre: 'Sortie au zoo', date: dem, heure: '08:30' } }],
  rendezVous: [{ id: 'r1', titre: 'Piscine', jour: dem, heure: '14:00', semaine: '2026-11-23', aPrevoir: [{ item: 'Maillot', coche: true, source: 'Coché par vous · 20h' }] }],
  coches: ['m1|Gourde'],
  aujourdhui: auj,
  demain: dem,
  quand,
  heure,
});
verifier('aujourd’hui avant demain ; ni cours ni jour hors fenêtre', elements[0].date === auj && !elements.some((e) => e.titre === 'Maths' || e.titre === 'Plus tard'), elements.map((e) => e.titre));
verifier('événement : « Aujourd’hui · 18h · Salle 3 »', elements.find((e) => e.cle === 'evt-e2')?.sousTitre === 'Aujourd’hui · 18h · Salle 3', elements.find((e) => e.cle === 'evt-e2'));
verifier('devoir pour demain cochable', elements.some((e) => e.sorte === 'devoir' && e.sousTitre === 'Mathématiques · pour demain' && !e.fait));
verifier('À prévoir d’un mot : coche locale lue', elements.some((e) => e.sorte === 'prevoir' && e.titre === 'Gourde' && e.fait) && elements.some((e) => e.sorte === 'prevoir' && e.titre === 'Casquette' && !e.fait));
verifier('rendez-vous fixe et son À prévoir coché (source gardée)', elements.some((e) => e.sorte === 'rendezvous' && e.titre === 'Piscine') && elements.some((e) => e.sorte === 'prevoir' && e.titre === 'Maillot' && e.fait && e.source === 'Coché par vous · 20h'));
verifier('un mot n’est JAMAIS un événement', !elements.some((e) => e.sorte === 'evenement' && e.cle.includes('m1')));
verifier('demain : les À prévoir suivent leur événement (8h30 avant 14h)', elements.filter((e) => e.date === dem).map((e) => e.titre).indexOf('Casquette') < elements.filter((e) => e.date === dem).map((e) => e.titre).indexOf('Piscine'));

const s1 = suggestionAccueil({ prenom: 'Lina', elements, aFaire: lignes, aujourdhui: auj, demain: dem, heureActuelle: '10:00' });
verifier('suggestion : événement du jour à venir, source agenda', s1?.texte === 'Aujourd’hui pour Lina : réunion parents.' && s1?.source === 'D’après l’agenda', s1);
const s2 = suggestionAccueil({ prenom: 'Lina', elements, aFaire: lignes, aujourdhui: auj, demain: dem, heureActuelle: '19:00' });
verifier('suggestion : événement passé → mot à traiter', s2?.source === 'D’après les mots du carnet' && /attend votre réponse/.test(s2.texte), s2);
const s3 = suggestionAccueil({ prenom: 'Lina', elements, aFaire: [], aujourdhui: auj, demain: dem, heureActuelle: '19:00' });
verifier('suggestion : devoirs pour demain', s3?.texte === 'Lina a 1 devoir pour demain : tables de 7.', s3);
verifier('suggestion : rien d’utile → absente', suggestionAccueil({ prenom: 'Lina', elements: [], aFaire: [], aujourdhui: auj, demain: dem, heureActuelle: '10:00' }) === null);
verifier('suggestion : vouvoiement, jamais « tu »', ![s1, s2, s3].some((s) => s && /\b(tu|ton|ta|tes)\b/i.test(s.texte)));

// Garde-fous de code (lot 6) : ni carte « ARIA », ni « Bonjour », ni fond d'écran ; invitation exacte ; ordre des sections.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const racine = join(import.meta.dirname, '..', '..');
// Code sans ses commentaires (les en-têtes citent les libellés retirés).
const src = (f: string) =>
  readFileSync(join(racine, f), 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const ecran = src('src/screens/AccueilScreen.tsx');
const corps = src('src/components/accueil/CorpsCarnet.tsx');
const entete = src('src/components/accueil/EnteteCarnet.tsx');
verifier('Accueil : plus de carte « ARIA » ni de nom en majuscules', !/toUpperCase\(\)/.test(ecran) && !/\bARIA\b/.test(ecran) && !/ariaCard/.test(ecran));
verifier('Accueil : plus de « Bonjour » ni de fond d’écran', !/Bonjour/.test(ecran + entete) && !/WALLPAPER|Wallpaper/.test(ecran));
verifier('Accueil : plus de « Dernières notes », « Voir le suivi », « Cette semaine »', !/Dernières notes|Voir le suivi|Cette semaine/.test(ecran + corps));
verifier('corps : invitation exacte + pilule « Ajouter »', corps.includes('Ajoutez la première pièce du carnet.') && corps.includes('>Ajouter<'));
verifier('écran : « Ajouter » ouvre la feuille du « + » (demanderAjoutCarnet)', ecran.includes("demanderAjoutCarnet({ onglet: 'Accueil' })"));
const ordre = ['À faire · ', 'Aujourd’hui et demain', 'Nouveau dans le carnet', 'suggestion ?'].map((t) => corps.indexOf(t));
verifier('corps : ordre À faire → Aujourd’hui et demain → Nouveau → suggestion', ordre.every((x, i) => x > 0 && (i === 0 || x > ordre[i - 1])), ordre);
verifier('en-tête : rond 52, prénom 24, ligne 13 px', /const TAILLE = 52/.test(entete) && /fontSize: 24/.test(entete) && /fontSize: 13/.test(entete));

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
