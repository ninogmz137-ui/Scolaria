/**
 * Archive d'export du carnet (L7b, droit à la portabilité) — partie PURE, testée sous Node
 * (archiveCarnet.test.mts) : noms de fichiers sûrs, contenu de l'archive (données.json, LISEZMOI.txt,
 * fichiers/…), compression par fflate (JavaScript pur, aucun module natif).
 */

import { zipSync, strToU8 } from 'fflate';

/** Nom de fichier sûr et lisible : « 2026-09-25_dessin-de-la-maison_1a2b3c4d.jpg ». */
export function nomFichierArchive(titre: string, date: string | null, id: string, extension: string): string {
  const base = (titre || 'document')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'document';
  const jour = /^\d{4}-\d{2}-\d{2}/.test(date ?? '') ? (date as string).slice(0, 10) + '_' : '';
  const ext = (extension || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${jour}${base}_${id.replace(/[^a-z0-9]/gi, '').slice(0, 8)}.${ext}`;
}

/** « carnet-lea-2026-09-28.zip » (prénom sans accent, date du jour). */
export function nomArchive(prenom: string, jour: Date = new Date()): string {
  const p = nomFichierArchive(prenom, null, 'x', 'zip').replace(/_x\.zip$/, '');
  return `carnet-${p}-${jour.toISOString().slice(0, 10)}.zip`;
}

export type FichierArchive = { chemin: string; octets: Uint8Array };

/** Chemin de la photo de l'enfant dans l'archive (sous fichiers/). */
export const CHEMIN_PHOTO_ARCHIVE = 'photo-de-l-enfant.jpg';

/**
 * Photo de l'enfant dans l'export (donnée personnelle d'un mineur, incluse dans l'export du carnet) : renvoie la ligne
 * de l'enfant complétée de `photo_dans_archive` et le fichier à ajouter. Sans octets (pas de photo, ou téléchargement
 * échoué) : `photo_dans_archive` vaut null et aucun fichier n'est ajouté.
 */
export function avecPhotoEnfant(
  enfant: Record<string, unknown>,
  octets: Uint8Array | null,
): { enfant: Record<string, unknown>; fichiers: FichierArchive[] } {
  if (!octets) return { enfant: { ...enfant, photo_dans_archive: null }, fichiers: [] };
  return {
    enfant: { ...enfant, photo_dans_archive: `fichiers/${CHEMIN_PHOTO_ARCHIVE}` },
    fichiers: [{ chemin: CHEMIN_PHOTO_ARCHIVE, octets }],
  };
}

export function construireArchive(donnees: unknown, lisezmoi: string, fichiers: FichierArchive[]): Uint8Array {
  const contenu: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    'LISEZMOI.txt': strToU8(lisezmoi),
    'donnees.json': strToU8(JSON.stringify(donnees, null, 2)),
  };
  // Photos et PDF sont déjà compressés : stockés tels quels (level 0), l'archive se fait vite.
  for (const f of fichiers) contenu[`fichiers/${f.chemin}`] = [f.octets, { level: 0 }];
  return zipSync(contenu, { level: 6 });
}

export function texteLisezmoi(o: {
  nomApp: string;
  prenom: string;
  genereLe: Date;
  nbFichiers: number;
  fichiersManquants: string[];
  sectionsManquantes: string[];
}): string {
  const lignes = [
    `Carnet de ${o.prenom} — export ${o.nomApp}`,
    `Créé le ${o.genereLe.toLocaleString('fr-FR')}`,
    '',
    'Contenu :',
    '- donnees.json : toutes les données du carnet que votre compte peut voir, au format JSON (format ouvert,',
    '  lisible par d’autres logiciels) : profil, années, apprentissages, mots et signatures, ajouts au carnet,',
    '  agenda, messages avec l’école, conversations Aria…',
    `- fichiers/ : les ${o.nbFichiers} photo(s) et document(s) du carnet. Dans donnees.json, chaque élément`,
    '  indique son fichier (« fichier_dans_archive »).',
    '',
    'Ne sont pas inclus : ce qui appartient à l’autre responsable seul (ses éléments marqués « privé », ses',
    'conversations privées avec l’enseignant, ses conversations Aria).',
  ];
  if (o.sectionsManquantes.length || o.fichiersManquants.length) {
    lignes.push('', 'ATTENTION, export incomplet :');
    if (o.sectionsManquantes.length) lignes.push(`- sections non lues : ${o.sectionsManquantes.join(', ')}`);
    if (o.fichiersManquants.length) lignes.push(`- fichiers non téléchargés : ${o.fichiersManquants.length}`);
    lignes.push('Relancez l’export avec une bonne connexion.');
  }
  return lignes.join('\n') + '\n';
}
