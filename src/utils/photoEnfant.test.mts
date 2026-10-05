// Photo de l'enfant : chemin, recadrage carré 512, cache des URL signées, nettoyage des métadonnées (EXIF / GPS).
// npm run test:photo-enfant
import {
  cheminPhotoEnfant, clePhoto, COTE_PHOTO_ENFANT, DUREE_CACHE_MS, DUREE_URL_SIGNEE_S, recadrerEnCarre, urlEncoreValable,
} from './photoEnfant.ts';
import { estJpeg, retirerMetadonnees } from './metadonneesImage.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, bon: boolean, detail = '') {
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : ${detail}`}`);
  if (bon) ok++;
  else echecs++;
}

// Chemin : exactement ce que la contrainte et les politiques de M35 acceptent.
const ID = '11111111-2222-4333-8444-555555555555';
verifier('chemin = <id>/avatar.jpg', cheminPhotoEnfant(ID) === `${ID}/avatar.jpg`);
verifier('le chemin passe l\'expression de la politique M35', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.jpg$/.test(cheminPhotoEnfant(ID)));

// Recadrage
const paysage = recadrerEnCarre(4000, 3000)!;
verifier('paysage 4000×3000 : carré 3000 centré, final 512', paysage.recadrage.width === 3000 && paysage.recadrage.height === 3000 && paysage.recadrage.originX === 500 && paysage.recadrage.originY === 0 && paysage.cote === 512);
const portrait = recadrerEnCarre(3000, 4000)!;
verifier('portrait 3000×4000 : carré 3000, décalé verticalement de 500', portrait.recadrage.originX === 0 && portrait.recadrage.originY === 500 && portrait.cote === 512);
const carre = recadrerEnCarre(1200, 1200)!;
verifier('carré 1200 : aucun recadrage, final 512', carre.recadrage.originX === 0 && carre.recadrage.originY === 0 && carre.cote === 512);
const petite = recadrerEnCarre(300, 200)!;
verifier('petite image 300×200 : jamais agrandie (final 200)', petite.cote === 200 && petite.recadrage.width === 200);
verifier('dimensions inconnues → null (aucun envoi)', recadrerEnCarre(0, 0) === null && recadrerEnCarre(-1, 5) === null);
verifier('le côté final ne dépasse jamais 512', [recadrerEnCarre(9000, 8000)!, recadrerEnCarre(513, 513)!].every((r) => r.cote <= COTE_PHOTO_ENFANT));

// Cache des URL signées : clé = chemin + date de mise à jour ; valable moins que l'URL (1 h).
verifier('la clé change quand la photo est remplacée', clePhoto('a/avatar.jpg', '2026-10-05T10:00:00Z') !== clePhoto('a/avatar.jpg', '2026-10-05T11:00:00Z'));
verifier('la clé est propre à l\'enfant', clePhoto('a/avatar.jpg', 'x') !== clePhoto('b/avatar.jpg', 'x'));
verifier('le cache expire avant l\'URL signée (50 min < 1 h)', DUREE_CACHE_MS < DUREE_URL_SIGNEE_S * 1000);
verifier('URL de 49 min : réutilisée ; de 51 min : refaite', urlEncoreValable(0, 49 * 60_000) && !urlEncoreValable(0, 51 * 60_000));

// Métadonnées : un JPEG avec EXIF (dont GPS) + commentaire + XMP ressort sans aucun de ces segments.
function segment(marqueur: number, contenu: number[]): number[] {
  const longueur = contenu.length + 2;
  return [0xff, marqueur, longueur >> 8, longueur & 0xff, ...contenu];
}
const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0));
const exifGps = segment(0xe1, [...ascii('Exif\0\0'), ...ascii('GPSLatitude=48.85;GPSLongitude=2.35')]);
const xmp = segment(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>'));
const commentaire = segment(0xfe, ascii('Photo de Lucas chez mamie'));
const jfif = segment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const donnees = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x01, 0xff, 0xda, 0x00, 0x02, 0xaa, 0xbb, 0xff, 0xd9]; // DQT + SOS + EOI (factice)
const brut = new Uint8Array([0xff, 0xd8, ...jfif, ...exifGps, ...xmp, ...commentaire, ...donnees]);
const texte = (o: Uint8Array) => String.fromCharCode(...o);
verifier('témoin : le JPEG de départ contient GPS, XMP et commentaire', /GPSLatitude/.test(texte(brut)) && /xmpmeta/.test(texte(brut)) && /mamie/.test(texte(brut)));
const propre = retirerMetadonnees(brut);
verifier('après nettoyage : JPEG valide', estJpeg(propre));
verifier('après nettoyage : plus de GPS, de XMP ni de commentaire', !/GPS|Exif|xmpmeta|mamie/.test(texte(propre)));
verifier('après nettoyage : les données de l\'image sont intactes (fin du fichier identique)', texte(propre).endsWith(texte(new Uint8Array(donnees))));

// Confidentialité : la photo n'est JAMAIS envoyée à Aria (app ni Edge Function), ni dans une notification, ni dans le
// contexte de l'enfant. Lecture du code source : une référence à la photo dans ces fichiers fait échouer le test.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const RACINE = join(import.meta.dirname, '..', '..');
const INTERDITS = /photo_path|photoPath|photoUpdatedAt|child-photos|photoUri|usePhotoUrl|urlPhoto|photoEnfant/;
const surveilles = [
  'src/services/ariaApi.ts', 'src/services/ariaActions.ts', 'src/services/ariaPreferences.ts', 'src/services/childContext.ts',
  'src/services/notifications.ts', 'supabase/functions/aria/index.ts',
  ...readdirSync(join(RACINE, 'supabase/functions/_shared')).filter((f) => f.endsWith('.ts') && !f.includes('.test.')).map((f) => `supabase/functions/_shared/${f}`),
];
for (const f of surveilles) {
  verifier(`${f} : aucune référence à la photo de l'enfant`, !INTERDITS.test(readFileSync(join(RACINE, f), 'utf8')));
}
verifier('témoin : le détecteur reconnaît une référence interdite', INTERDITS.test('envoyer(child.photoPath)') && INTERDITS.test("from('child-photos')"));

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
