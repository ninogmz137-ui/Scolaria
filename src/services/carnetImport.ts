/**
 * carnetImport — choisir un fichier pour « Ajouter au carnet » et le préparer AVANT l'envoi.
 *
 * Modules natifs utilisés (déjà dans le dev client du 18 sept. 2026) : expo-image-picker (appareil
 * photo, galerie), expo-document-picker (PDF), expo-file-system (lecture des octets).
 * Confidentialité :
 *  - photos compressées par le sélecteur (quality 0,7, rééncodage JPEG) ;
 *  - métadonnées (EXIF, dont la position GPS ; XMP ; IPTC ; commentaires) retirées en JavaScript
 *    AVANT l'envoi (src/utils/metadonneesImage.ts, prouvé par `npm run test:exif`) ;
 *  - HEIC refusé : ses métadonnées ne peuvent pas être retirées sans module natif de conversion
 *    (expo-image-manipulator, absent du dev client installé → question ouverte, voir le rapport B5).
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { estJpeg, estPng, retirerMetadonnees } from '../utils/metadonneesImage';
import { ErreurCarnet, TAILLE_MAX_OCTETS } from './carnetService';

export type SourceAjout = 'photo' | 'capture' | 'document' | 'jalon';

export interface FichierPrepare {
  octets: Uint8Array;
  mime: 'image/jpeg' | 'image/png' | 'application/pdf';
  extension: 'jpg' | 'png' | 'pdf';
  /** URI locale (aperçu, et fichier conservé en mémoire en mode démo). */
  uriLocale: string;
  nom: string;
}

// Fichier préparé en attente du formulaire (des octets ne passent pas dans les paramètres de navigation).
let enAttente: FichierPrepare | null = null;
export function mettreEnAttente(f: FichierPrepare | null) {
  enAttente = f;
}
export function prendreEnAttente(): FichierPrepare | null {
  const f = enAttente;
  enAttente = null;
  return f;
}

/** null = le parent a annulé. Erreur (ErreurCarnet) = message clair à afficher. */
export async function choisirFichier(source: Exclude<SourceAjout, 'jalon'>): Promise<FichierPrepare | null> {
  let uri: string;
  let nom: string;
  if (source === 'document') {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return null;
    uri = r.assets[0].uri;
    nom = r.assets[0].name ?? 'document.pdf';
  } else {
    const permission = source === 'photo'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new ErreurCarnet(
        source === 'photo'
          ? 'L’accès à l’appareil photo est refusé. Autorisez-le dans les réglages du téléphone.'
          : 'L’accès aux photos est refusé. Autorisez-le dans les réglages du téléphone.',
      );
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, exif: false, allowsEditing: false };
    const r = source === 'photo' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (r.canceled || !r.assets?.[0]) return null;
    uri = r.assets[0].uri;
    nom = r.assets[0].fileName ?? 'image.jpg';
    if (/\.hei[cf]$/i.test(nom) || r.assets[0].mimeType === 'image/heic') {
      throw new ErreurCarnet('Format HEIC non pris en charge pour l’instant : choisissez une photo JPEG ou PNG.');
    }
  }
  return preparer(uri, nom);
}

/** Lit le fichier, vérifie son type réel (octets, pas l'extension), retire les métadonnées, contrôle la taille. */
export async function preparer(uri: string, nom: string): Promise<FichierPrepare> {
  const brut = await new File(uri).bytes();
  let fichier: Omit<FichierPrepare, 'uriLocale' | 'nom'>;
  if (estJpeg(brut)) fichier = { octets: retirerMetadonnees(brut), mime: 'image/jpeg', extension: 'jpg' };
  else if (estPng(brut)) fichier = { octets: retirerMetadonnees(brut), mime: 'image/png', extension: 'png' };
  else if (String.fromCharCode(...brut.subarray(0, 5)) === '%PDF-') fichier = { octets: brut, mime: 'application/pdf', extension: 'pdf' };
  else throw new ErreurCarnet('Format non pris en charge : photo (JPEG, PNG) ou document PDF.');
  if (fichier.octets.length > TAILLE_MAX_OCTETS) throw new ErreurCarnet('Fichier trop lourd : 10 Mo au plus.');
  return { ...fichier, uriLocale: uri, nom };
}
