/**
 * Preuve que les métadonnées (dont la position GPS) sont retirées avant l'envoi — `npm run test:exif`.
 * Images construites octet par octet : un JPEG avec un segment EXIF contenant des coordonnées GPS,
 * un XMP et un commentaire ; un PNG avec des blocs eXIf, tEXt et tIME.
 */
import { retirerMetadonnees } from './metadonneesImage.ts';

let echecs = 0;
const verdict = (ok: boolean, libelle: string) => { if (!ok) echecs++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${libelle}`); };
const octets = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...Buffer.from(p, 'latin1')] : p)));
const segment = (marqueur: number, contenu: number[] | string) => {
  const c = typeof contenu === 'string' ? [...Buffer.from(contenu, 'latin1')] : contenu;
  const l = c.length + 2;
  return [0xff, marqueur, l >> 8, l & 0xff, ...c];
};
const contient = (o: Uint8Array, texte: string) => Buffer.from(o).includes(Buffer.from(texte, 'latin1'));

// ─── JPEG ───────────────────────────────────────────────────────────────────
// EXIF réaliste : en-tête « Exif\0\0 », TIFF little-endian, pointeur GPS (0x8825) et coordonnées
// (48° 51′ 29″ N, 2° 17′ 40″ E) écrites en rationnels, plus le texte « GPSLatitude » pour la lisibilité.
const gps = [0x88, 0x25, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00,
  48, 0, 0, 0, 1, 0, 0, 0, 51, 0, 0, 0, 1, 0, 0, 0, 29, 0, 0, 0, 1, 0, 0, 0,
  2, 0, 0, 0, 1, 0, 0, 0, 17, 0, 0, 0, 1, 0, 0, 0, 40, 0, 0, 0, 1, 0, 0, 0];
const exif = [...Buffer.from('Exif\0\0II*\0\x08\0\0\0', 'latin1'), ...gps, ...Buffer.from('GPSLatitude Redmi Note 9S', 'latin1')];
const donneesImage = [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0xff, 0x00, 0x42];
const jpeg = octets(
  [0xff, 0xd8],
  segment(0xe0, 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0'),
  segment(0xe1, exif),
  segment(0xe1, 'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>GPSLongitude</x:xmpmeta>'),
  segment(0xed, 'Photoshop 3.0\0IPTC ville=Paris'),
  segment(0xfe, 'Commentaire : maison de Lucas'),
  segment(0xee, 'Adobe\0\x64\0\0\0\0\x01'),
  segment(0xdb, [0x00, ...Array(64).fill(1)]),
  segment(0xc0, [8, 0, 2, 0, 2, 1, 1, 0x11, 0]),
  segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
  donneesImage,
  [0xff, 0xd9],
);
const jpegPropre = retirerMetadonnees(jpeg);
verdict(contient(jpeg, 'GPSLatitude') && contient(jpeg, 'Exif'), 'JPEG de départ : contient bien un EXIF avec GPS');
verdict(!contient(jpegPropre, 'Exif'), 'JPEG : segment EXIF retiré');
verdict(!contient(jpegPropre, 'GPS'), 'JPEG : aucune trace de GPS (EXIF ni XMP)');
verdict(!contient(jpegPropre, 'Redmi'), 'JPEG : modèle d’appareil retiré');
verdict(!contient(jpegPropre, 'IPTC') && !contient(jpegPropre, 'Commentaire'), 'JPEG : IPTC et commentaire retirés');
verdict(!Buffer.from(jpegPropre).includes(Buffer.from(gps.slice(12, 20))), 'JPEG : les coordonnées (48° 51′…) ne sont plus dans le fichier');
verdict(contient(jpegPropre, 'JFIF') && contient(jpegPropre, 'Adobe'), 'JPEG : JFIF et Adobe (utiles au décodage) gardés');
verdict(jpegPropre[0] === 0xff && jpegPropre[1] === 0xd8 && jpegPropre.at(-2) === 0xff && jpegPropre.at(-1) === 0xd9, 'JPEG : début (SOI) et fin (EOI) intacts');
verdict(Buffer.from(jpegPropre).includes(Buffer.from(donneesImage)), 'JPEG : données de l’image identiques, non recompressées');

// ─── PNG ────────────────────────────────────────────────────────────────────
const bloc = (type: string, contenu: string) => {
  const c = [...Buffer.from(contenu, 'latin1')];
  return [0, 0, (c.length >> 8) & 0xff, c.length & 0xff, ...Buffer.from(type, 'latin1'), ...c, 0, 0, 0, 0];
};
const png = octets(
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  bloc('IHDR', '\0\0\0\x01\0\0\0\x01\x08\x02\0\0\0'),
  bloc('eXIf', 'MM\0*GPSLatitude 48.85'),
  bloc('tEXt', 'Author\0Sophie'),
  bloc('tIME', '\x07\xea\x09\x1a\x0a\x00\x00'),
  bloc('IDAT', 'donnees-image'),
  bloc('IEND', ''),
);
const pngPropre = retirerMetadonnees(png);
verdict(!contient(pngPropre, 'eXIf') && !contient(pngPropre, 'GPS'), 'PNG : bloc eXIf (GPS) retiré');
verdict(!contient(pngPropre, 'Sophie') && !contient(pngPropre, 'tIME'), 'PNG : texte (auteur) et date retirés');
verdict(contient(pngPropre, 'IHDR') && contient(pngPropre, 'donnees-image') && contient(pngPropre, 'IEND'), 'PNG : en-tête, image et fin gardés');

// ─── Autres formats ─────────────────────────────────────────────────────────
const pdf = octets('%PDF-1.7 contenu');
verdict(retirerMetadonnees(pdf) === pdf, 'PDF : renvoyé tel quel');

console.log(`\n${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
