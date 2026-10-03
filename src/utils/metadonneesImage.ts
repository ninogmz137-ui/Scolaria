/**
 * Retrait des métadonnées d'une image AVANT l'envoi (lot B5, confidentialité) — JavaScript pur,
 * sans module natif, testé par `npm run test:exif` (src/utils/metadonneesImage.test.mts).
 *
 * JPEG : on retire les segments APP1 à APP13 et APP15 (EXIF — dont la position GPS, l'appareil, la
 *        date —, XMP, IPTC / Photoshop…) et les commentaires (COM). On garde APP0 (JFIF) et APP14
 *        (Adobe : nécessaire au bon décodage des couleurs). Les données de l'image ne sont pas
 *        recompressées : les octets de l'image restent identiques.
 * PNG  : on retire les blocs eXIf (EXIF), tEXt / zTXt / iTXt (texte libre, XMP) et tIME.
 * Autre format (PDF, HEIC…) : renvoyé tel quel — le HEIC n'est pas nettoyé ici (voir carnetImport).
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_BLOCS_RETIRES = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

export function estJpeg(o: Uint8Array): boolean {
  return o.length > 3 && o[0] === 0xff && o[1] === 0xd8;
}

export function estPng(o: Uint8Array): boolean {
  return o.length > 8 && PNG_SIGNATURE.every((b, i) => o[i] === b);
}

function nettoyerJpeg(o: Uint8Array): Uint8Array {
  const garde: Uint8Array[] = [o.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 4 <= o.length) {
    if (o[i] !== 0xff) throw new Error('JPEG invalide : marqueur attendu');
    const marqueur = o[i + 1];
    if (marqueur === 0xff) { i += 1; continue; } // octets de remplissage
    if (marqueur === 0xda) {
      // SOS : tout ce qui suit (données de l'image jusqu'à EOI) est gardé tel quel.
      garde.push(o.subarray(i));
      return concat(garde);
    }
    if (marqueur === 0xd9) { garde.push(o.subarray(i, i + 2)); return concat(garde); } // EOI
    const longueur = (o[i + 2] << 8) | o[i + 3];
    const fin = i + 2 + longueur;
    if (fin > o.length) throw new Error('JPEG invalide : segment tronqué');
    const app = marqueur >= 0xe1 && marqueur <= 0xef && marqueur !== 0xee; // APP1–APP13, APP15
    const commentaire = marqueur === 0xfe;
    if (!app && !commentaire) garde.push(o.subarray(i, fin));
    i = fin;
  }
  throw new Error('JPEG invalide : pas de données d’image');
}

function nettoyerPng(o: Uint8Array): Uint8Array {
  const garde: Uint8Array[] = [o.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= o.length) {
    const longueur = ((o[i] << 24) >>> 0) + (o[i + 1] << 16) + (o[i + 2] << 8) + o[i + 3];
    const type = String.fromCharCode(o[i + 4], o[i + 5], o[i + 6], o[i + 7]);
    const fin = i + 12 + longueur;
    if (fin > o.length) throw new Error('PNG invalide : bloc tronqué');
    if (!PNG_BLOCS_RETIRES.has(type)) garde.push(o.subarray(i, fin));
    i = fin;
    if (type === 'IEND') break;
  }
  return concat(garde);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const sortie = new Uint8Array(total);
  let i = 0;
  for (const p of parts) { sortie.set(p, i); i += p.length; }
  return sortie;
}

/** Octets de l'image sans métadonnées (JPEG / PNG) ; autres formats renvoyés tels quels. */
export function retirerMetadonnees(octets: Uint8Array): Uint8Array {
  if (estJpeg(octets)) return nettoyerJpeg(octets);
  if (estPng(octets)) return nettoyerPng(octets);
  return octets;
}
