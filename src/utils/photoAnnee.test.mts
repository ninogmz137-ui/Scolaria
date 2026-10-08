// Tests des règles pures de la photo par année (variante A). Usage : npm run test:photo-annee
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { choisirPhoto, cibleEcriture, millesimePrecedent, libelleMillesime, cheminPhotoAnnee, type LigneAnnee } from './photoAnnee.ts';

let ok = 0;
let echecs = 0;
// Comparaison indépendante de l'ordre des clés.
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
const verifier = (nom: string, obtenu: unknown, voulu: unknown) => {
  const bon = stable(obtenu) === stable(voulu);
  console.log(`${bon ? 'OK  ' : 'ÉCHEC'} ${nom}${bon ? '' : ` — obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(voulu)}`}`);
  bon ? ok++ : echecs++;
};

const E = '11111111-1111-4111-8111-111111111111';
const an = (id: string, m: string, statut: string, photo: string | null = null, maj: string | null = null): LigneAnnee => ({ id, annee_scolaire: m, statut, photo_path: photo, updated_at: maj });
const ch = (id: string) => cheminPhotoAnnee(E, id);

verifier('millésime précédent', millesimePrecedent('2026-2027'), '2025-2026');
verifier('millésime au format inattendu → null', [millesimePrecedent('2026'), millesimePrecedent('2026-2028'), millesimePrecedent('')], [null, null, null]);
verifier('libellé avec tiret demi-cadratin', libelleMillesime('2025-2026'), '2025–2026');
verifier('chemin d\'une année = <enfant>/<année>.jpg', ch('abc'), `${E}/abc.jpg`);

// 1. Photo de l'année en cours : affichée, sans signe.
verifier('photo de l\'année en cours : affichée, pas de signe, supprimable',
  choisirPhoto([an('a2', '2026-2027', 'active', ch('a2'), 'T2'), an('a1', '2025-2026', 'archivée', ch('a1'), 'T1')]),
  { chemin: ch('a2'), updatedAt: 'T2', anneeActiveId: 'a2', anterieure: null, deCetteAnnee: true, ancienne: false });

// 2. Repli sur N−1 : affichée AVEC signe, mais on écrit sur l'année en cours.
verifier('année en cours sans photo → photo de N−1 avec signe d\'année passée',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a1', '2025-2026', 'archivée', ch('a1'), 'T1')]),
  { chemin: ch('a1'), updatedAt: 'T1', anneeActiveId: 'a2', anterieure: '2025–2026', deCetteAnnee: false, ancienne: false });

// 3. N−1 SEULEMENT : une photo plus ancienne n'est jamais reprise.
verifier('photo d\'il y a DEUX ans seulement (N−2) : pas de repli → initiale',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a1', '2025-2026', 'archivée'), an('a0', '2024-2025', 'archivée', ch('a0'), 'T0')]),
  { chemin: null, updatedAt: null, anneeActiveId: 'a2', anterieure: null, deCetteAnnee: false, ancienne: false });
verifier('N−1 sans photo mais N−2 avec : toujours pas de repli sur N−2',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a1', '2025-2026', 'importée', null), an('a0', '2024-2025', 'archivée', ch('a0'))]).chemin, null);
verifier('année N−1 absente (trou) : pas de repli sur une année plus ancienne',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a0', '2023-2024', 'archivée', ch('a0'))]).chemin, null);
verifier('une année FUTURE n\'est jamais un repli', choisirPhoto([an('a2', '2026-2027', 'active'), an('a3', '2027-2028', 'importée', ch('a3'))]).chemin, null);

// 4. Transition : l'ancienne colonne ne sert que si aucune année n'a de photo (N−1 comprise).
verifier('transition : ancienne colonne utilisée quand aucune année n\'a de photo',
  choisirPhoto([an('a2', '2026-2027', 'active')], { chemin: `${E}/avatar.jpg`, updatedAt: 'T0' }),
  { chemin: `${E}/avatar.jpg`, updatedAt: 'T0', anneeActiveId: 'a2', anterieure: null, deCetteAnnee: true, ancienne: true });
verifier('transition : la photo de N−1 passe avant l\'ancienne colonne',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a1', '2025-2026', 'archivée', ch('a1'))], { chemin: `${E}/avatar.jpg`, updatedAt: 'T0' }).chemin, ch('a1'));
verifier('schéma sans M36 (aucune ligne d\'année) : ancienne colonne seule', choisirPhoto([], { chemin: `${E}/avatar.jpg`, updatedAt: 'T0' }).chemin, `${E}/avatar.jpg`);

// 5. Cas limites.
verifier('aucune année, aucune photo → initiale', choisirPhoto([]), { chemin: null, updatedAt: null, anneeActiveId: null, anterieure: null, deCetteAnnee: false, ancienne: false });
verifier('deux années « active » : la plus récente est l\'année en cours', choisirPhoto([an('x', '2025-2026', 'active'), an('y', '2026-2027', 'active')]).anneeActiveId, 'y');
verifier('l\'écriture vise toujours l\'année EN COURS, même quand N−1 est affichée',
  choisirPhoto([an('a2', '2026-2027', 'active'), an('a1', '2025-2026', 'archivée', ch('a1'))]).anneeActiveId, 'a2');

// 5 bis. OÙ ÉCRIT-ON ? (ajout / remplacement : l'année en cours ; suppression d'une photo de l'ancien modèle : l'ancienne colonne)
const parAnnee = { parAnnee: true, anneeId: 'a2', ancienne: false };
verifier('ajout, base avec M36 : <enfant>/<année en cours>.jpg', cibleEcriture(E, parAnnee, 'ajout'), { modele: 'annee', chemin: ch('a2'), anneeId: 'a2' });
verifier('suppression d’une photo de l’année : l’année en cours', cibleEcriture(E, parAnnee, 'suppression').modele, 'annee');
verifier('suppression d’une photo de l’ANCIEN modèle (affichée par transition) : ancienne colonne et avatar.jpg',
  cibleEcriture(E, { ...parAnnee, ancienne: true }, 'suppression'), { modele: 'ancien', chemin: `${E}/avatar.jpg`, anneeId: null });
verifier('ajout alors que l’ancienne photo est affichée : écrit sur l’année (la nouvelle photo gagne)', cibleEcriture(E, { ...parAnnee, ancienne: true }, 'ajout').modele, 'annee');
verifier('base sans M36 : ancien modèle, ajout et suppression', [cibleEcriture(E, { parAnnee: false }, 'ajout').modele, cibleEcriture(E, { parAnnee: false }, 'suppression').modele], ['ancien', 'ancien']);
verifier('enfant sans année en cours : ancien modèle', cibleEcriture(E, { parAnnee: true, anneeId: null }, 'ajout').modele, 'ancien');
verifier('la suppression ne vise jamais N−1 (aucun paramètre ne permet de désigner une autre année)', cibleEcriture(E, parAnnee, 'suppression').anneeId, 'a2');

// 6. Gardes de code : aucune lecture par l'école, repli limité, pas de nom de marque dans le code neuf.
const lire = (f: string) => readFileSync(join(import.meta.dirname, f), 'utf8').replace(/\r\n/g, '\n');
const src = lire('photoAnnee.ts');
verifier('le module ne mentionne ni classes, ni enseignant, ni classe_id (aucune lecture par l\'école)', /classes|enseignant|classe_id|teacher/i.test(src.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false);
verifier('aucun nom de marque dans le module', /scolaria|theka/i.test(src), false);
verifier('le repli ne cherche que le millésime précédent (un seul find sur millesimePrecedent)', (src.match(/millesimePrecedent\(/g) ?? []).length >= 2 && !/for \(|\.reverse\(|while \(/.test(src), true);

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
