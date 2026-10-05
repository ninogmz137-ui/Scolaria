// Tests de l'archive d'export (L7b). Lancer : npm run test:export
import { unzipSync, strFromU8 } from 'fflate';
import { nomFichierArchive, nomArchive, construireArchive, texteLisezmoi, avecPhotoEnfant } from './archiveCarnet.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`}`);
  if (bon) ok++;
  else echecs++;
}

const id = '1a2b3c4d-0000-4000-8000-000000000000';
verifier('nom lisible, sans accent, daté', nomFichierArchive('Dessin de la maison, été !', '2026-09-25', id, 'JPG'), '2026-09-25_dessin-de-la-maison-ete_1a2b3c4d.jpg');
verifier('titre vide → « document »', nomFichierArchive('', null, id, 'pdf'), 'document_1a2b3c4d.pdf');
verifier('pas de chemin possible dans le nom (../)', nomFichierArchive('../../etc/passwd', null, id, 'pdf'), 'etc-passwd_1a2b3c4d.pdf');
verifier('titre long tronqué à 50 caractères', nomFichierArchive('a'.repeat(80), null, id, 'jpg').length, 50 + 1 + 8 + 4);
verifier('date invalide ignorée', nomFichierArchive('Livret', 'hier', id, 'pdf'), 'livret_1a2b3c4d.pdf');
verifier('nom de l’archive', nomArchive('Léa', new Date('2026-09-28T10:00:00Z')), 'carnet-lea-2026-09-28.zip');

const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const lisezmoi = texteLisezmoi({ nomApp: 'App', prenom: 'Léa', genereLe: new Date(), nbFichiers: 1, fichiersManquants: [], sectionsManquantes: [] });
const zip = construireArchive({ enfant: { prenom: 'Léa' }, carnet: [{ titre: 'Dessin', fichier_dans_archive: 'fichiers/a.jpg' }] }, lisezmoi, [{ chemin: 'a.jpg', octets: photo }]);
const contenu = unzipSync(zip);
verifier('archive : 3 entrées', Object.keys(contenu).sort(), ['LISEZMOI.txt', 'donnees.json', 'fichiers/a.jpg']);
verifier('données relues à l’identique (accents compris)', JSON.parse(strFromU8(contenu['donnees.json'])).enfant.prenom, 'Léa');
verifier('fichier relu octet pour octet', Array.from(contenu['fichiers/a.jpg']), Array.from(photo));
verifier('LISEZMOI sans « incomplet » quand tout est là', /incomplet/.test(strFromU8(contenu['LISEZMOI.txt'])), false);
const incomplet = texteLisezmoi({ nomApp: 'App', prenom: 'Léa', genereLe: new Date(), nbFichiers: 1, fichiersManquants: ['x'], sectionsManquantes: ['agenda'] });
verifier('LISEZMOI signale un export incomplet', /incomplet[\s\S]*agenda[\s\S]*fichiers non téléchargés : 1/.test(incomplet), true);

// Photo de l'enfant dans l'export
const octetsPhoto = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 4, 0, 1, 0xff, 0xd9]);
const avecPhoto = avecPhotoEnfant({ prenom: 'Léa', photo_path: 'x/avatar.jpg' }, octetsPhoto);
const zipPhoto = unzipSync(construireArchive({ enfant: avecPhoto.enfant }, lisezmoi, avecPhoto.fichiers));
verifier('export : la photo est dans fichiers/photo-de-l-enfant.jpg', Object.keys(zipPhoto).includes('fichiers/photo-de-l-enfant.jpg'), true);
verifier('export : octets de la photo identiques', Array.from(zipPhoto['fichiers/photo-de-l-enfant.jpg']), Array.from(octetsPhoto));
verifier('export : donnees.json pointe la photo', JSON.parse(strFromU8(zipPhoto['donnees.json'])).enfant.photo_dans_archive, 'fichiers/photo-de-l-enfant.jpg');
verifier('export : photo_path (ligne de l’enfant) conservé dans donnees.json', JSON.parse(strFromU8(zipPhoto['donnees.json'])).enfant.photo_path, 'x/avatar.jpg');
const sansPhoto = avecPhotoEnfant({ prenom: 'Léa' }, null);
verifier('sans photo : aucun fichier et photo_dans_archive null', [sansPhoto.fichiers.length, sansPhoto.enfant.photo_dans_archive], [0, null]);

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
