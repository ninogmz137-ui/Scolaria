/**
 * carnetImport — choisir un fichier pour « Ajouter au carnet » et le préparer AVANT l'envoi.
 *
 * Modules natifs : expo-image-picker (appareil photo, galerie), expo-document-picker (PDF),
 * expo-file-system (lecture des octets), expo-image-manipulator (L5, 27 sept 2026 — nouveau build requis).
 * Confidentialité et poids (L5, OBLIGATOIRE, iOS et Android) :
 *  - TOUTE image (JPEG, PNG, HEIC/HEIF de l'iPhone) est réencodée en JPEG par expo-image-manipulator :
 *    HEIC → JPEG, plus grand côté ramené à 2048 px (utils/redimension, `npm run test:photo`), qualité 0,8 ;
 *    le réencodage ne recopie aucune métadonnée ;
 *  - double sécurité : métadonnées (EXIF dont GPS, XMP, IPTC, commentaires) retirées en JavaScript AVANT
 *    l'envoi (src/utils/metadonneesImage.ts, `npm run test:exif`).
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { dimensionsCibles, QUALITE_JPEG } from '../utils/redimension';
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
    // Qualité 1 : la seule compression est celle du réencodage JPEG ci-dessous (pas de double perte).
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
    const r = source === 'photo' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    nom = (a.fileName ?? 'photo').replace(/\.[a-z0-9]+$/i, '') + '.jpg';
    uri = await convertirEnJpeg(a.uri, a.width, a.height);
  }
  return preparer(uri, nom);
}

/**
 * Photo → JPEG sans métadonnées, plus grand côté ≤ 2048 px (HEIC compris). Renvoie l'URI du JPEG produit
 * (cache privé de l'app). Échec du décodage → message clair.
 */
export async function convertirEnJpeg(uri: string, largeur?: number, hauteur?: number): Promise<string> {
  // Module natif chargé À LA DEMANDE : une app installée avant L5 (sans le module) ne plante pas au
  // démarrage ; elle affiche un message clair au moment d'ajouter une photo.
  let ImageManipulator: typeof import('expo-image-manipulator').ImageManipulator;
  let SaveFormat: typeof import('expo-image-manipulator').SaveFormat;
  try {
    ({ ImageManipulator, SaveFormat } = require('expo-image-manipulator'));
  } catch {
    throw new ErreurCarnet('Cette version de l’app ne sait pas encore préparer les photos : mettez-la à jour.');
  }
  try {
    const contexte = ImageManipulator.manipulate(uri);
    let l = largeur ?? 0;
    let h = hauteur ?? 0;
    if (!(l > 0 && h > 0)) {
      const brute = await ImageManipulator.manipulate(uri).renderAsync();
      l = brute.width;
      h = brute.height;
    }
    const cible = dimensionsCibles(l, h);
    if (cible) contexte.resize(cible);
    const image = await contexte.renderAsync();
    const resultat = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITE_JPEG });
    return resultat.uri;
  } catch {
    throw new ErreurCarnet('Cette photo n’a pas pu être préparée. Essayez une autre photo.');
  }
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
