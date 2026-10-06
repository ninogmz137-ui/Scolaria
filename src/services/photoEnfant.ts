/**
 * photoEnfant — photo de l'enfant : choisir, préparer, envoyer, supprimer, lire (CLAUDE.md « Photo de l'enfant »).
 *
 * Donnée personnelle d'un MINEUR. Règles :
 *  - bucket PRIVÉ « child-photos », un seul objet par enfant : `<id>/avatar.jpg` (upsert) ; jamais de lien public ;
 *  - lecture par URL signée d'1 h, mémorisée en mémoire pour la session (clé = chemin + date de mise à jour) ;
 *  - ré-encodage SUR L'APPAREIL avant tout envoi : carré centré 512 × 512, JPEG 0,8 (expo-image-manipulator ne recopie
 *    aucune métadonnée), puis nettoyage JavaScript en seconde sécurité, puis CONTRÔLE : si une trace d'EXIF / GPS /
 *    XMP / commentaire subsiste, rien n'est envoyé ;
 *  - jamais envoyée à l'Edge Function d'Aria ni au modèle, jamais dans un journal ni une notification : ce module ne
 *    journalise rien (ni chemin, ni URL, ni erreur brute) ;
 *  - jamais en mode démo (initiales seulement) : les appelants ne proposent pas la fonction en démo.
 * Modules natifs chargés À LA DEMANDE (un dev client sans le module affiche un message clair, jamais un plantage).
 */

import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { classerErreur } from './erreurs';
import { estJpeg, retirerMetadonnees } from '../utils/metadonneesImage';
import { BUCKET_PHOTOS, DUREE_URL_SIGNEE_S, QUALITE_PHOTO_ENFANT, cheminPhotoEnfant, recadrerEnCarre } from '../utils/photoEnfant';
import { CacheUrls } from '../utils/cacheUrls';

export type SourcePhoto = 'camera' | 'galerie';

/** Message prêt à afficher. */
export class ErreurPhoto extends Error {}

function erreurReseau(e: unknown, defaut: string): ErreurPhoto {
  const type = classerErreur(e);
  if (type === 'reseau') return new ErreurPhoto('Pas de connexion : la photo n’a pas été enregistrée. Réessayez quand le réseau est revenu.');
  if (type === 'session') return new ErreurPhoto('Votre session a expiré : reconnectez-vous, puis recommencez.');
  return new ErreurPhoto(defaut);
}

/** Reste-t-il une trace de métadonnées dans ce JPEG (EXIF dont GPS, XMP, IPTC, commentaire) ? */
export function contientDesMetadonnees(octets: Uint8Array): boolean {
  let i = 2;
  while (i + 4 <= octets.length) {
    if (octets[i] !== 0xff) return true; // structure inattendue : on ne prend aucun risque
    const marqueur = octets[i + 1];
    if (marqueur === 0xff) { i += 1; continue; }
    if (marqueur === 0xda || marqueur === 0xd9) return false; // début des données image : plus de segments
    if ((marqueur >= 0xe1 && marqueur <= 0xed) || marqueur === 0xef || marqueur === 0xfe) return true; // APP1…13, APP15, COM
    i += 2 + ((octets[i + 2] << 8) | octets[i + 3]);
  }
  return false;
}

/**
 * Appareil photo ou galerie, recadrage carré, puis préparation. Renvoie les octets du JPEG prêt à envoyer, ou
 * null si la personne a annulé. Refus de permission, photo illisible, module absent : ErreurPhoto (message clair).
 */
export async function choisirEtPreparerPhoto(source: SourcePhoto): Promise<Uint8Array | null> {
  let ImagePicker: typeof import('expo-image-picker');
  try {
    ImagePicker = require('expo-image-picker');
  } catch {
    throw new ErreurPhoto('Cette version de l’app ne sait pas encore prendre de photo : mettez-la à jour.');
  }
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ErreurPhoto(
      source === 'camera'
        ? 'L’accès à l’appareil photo est refusé. Autorisez-le dans les réglages du téléphone.'
        : 'L’accès aux photos est refusé. Autorisez-le dans les réglages du téléphone.',
    );
  }
  // Recadrage carré proposé par le système ; qualité 1 : la seule compression est le ré-encodage ci-dessous.
  const options: import('expo-image-picker').ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  };
  const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];

  let ImageManipulator: typeof import('expo-image-manipulator').ImageManipulator;
  let SaveFormat: typeof import('expo-image-manipulator').SaveFormat;
  try {
    ({ ImageManipulator, SaveFormat } = require('expo-image-manipulator'));
  } catch {
    throw new ErreurPhoto('Cette version de l’app ne sait pas encore préparer les photos : mettez-la à jour.');
  }
  let octets: Uint8Array;
  try {
    let l = a.width;
    let h = a.height;
    if (!(l > 0 && h > 0)) {
      const brute = await ImageManipulator.manipulate(a.uri).renderAsync();
      l = brute.width;
      h = brute.height;
    }
    const plan = recadrerEnCarre(l, h);
    if (!plan) throw new Error('dimensions');
    const contexte = ImageManipulator.manipulate(a.uri);
    if (plan.recadrage.width !== l || plan.recadrage.height !== h) contexte.crop(plan.recadrage);
    if (plan.cote !== plan.recadrage.width) contexte.resize({ width: plan.cote, height: plan.cote });
    const image = await contexte.renderAsync();
    const resultat = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITE_PHOTO_ENFANT });
    octets = await new File(resultat.uri).bytes();
  } catch {
    throw new ErreurPhoto('Cette photo n’a pas pu être préparée. Essayez une autre photo.');
  }
  if (!estJpeg(octets)) throw new ErreurPhoto('Cette photo n’a pas pu être préparée. Essayez une autre photo.');
  const propre = retirerMetadonnees(octets);
  // Fail-closed : une trace de métadonnées après ré-encodage ET nettoyage = on n'envoie rien.
  if (contientDesMetadonnees(propre)) throw new ErreurPhoto('Cette photo n’a pas pu être préparée. Essayez une autre photo.');
  return propre;
}

/** Envoie (ou remplace : upsert) l'unique photo de l'enfant. Renvoie son chemin. */
export async function envoyerPhoto(childId: string, octets: Uint8Array): Promise<string> {
  const chemin = cheminPhotoEnfant(childId);
  try {
    const { error } = await supabase.storage
      .from(BUCKET_PHOTOS)
      .upload(chemin, octets, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } catch (e) {
    throw erreurReseau(e, 'La photo n’a pas pu être enregistrée. Réessayez.');
  }
  oublierPhoto(chemin);
  return chemin;
}

/**
 * Retire l'objet. À appeler APRÈS avoir mis photo_path à NULL : en cas d'échec ici, l'objet n'est plus référencé et le
 * nettoyage quotidien (photos_orphelines) le supprime ; la photo n'apparaît plus nulle part.
 */
export async function retirerObjetPhoto(childId: string): Promise<void> {
  const chemin = cheminPhotoEnfant(childId);
  oublierPhoto(chemin);
  try {
    await supabase.storage.from(BUCKET_PHOTOS).remove([chemin]);
  } catch {
    /* repris par le nettoyage quotidien */
  }
}

// ─── Lecture : URL signée d'1 h, mémorisée pour la session ───────────────────

const cache = new CacheUrls(async (chemin) => {
  const { data, error } = await supabase.storage.from(BUCKET_PHOTOS).createSignedUrl(chemin, DUREE_URL_SIGNEE_S);
  return error || !data?.signedUrl ? null : data.signedUrl;
});

function oublierPhoto(chemin: string) {
  cache.oublier(chemin);
}

/** À la déconnexion : aucune URL signée de photo d'enfant ne survit à la session. */
export function viderCachePhotos() {
  cache.vider();
}

/** URL signée de la photo (1 h), ou null (échec : on affiche l'initiale, jamais d'erreur à l'écran). */
export function urlPhoto(photoPath: string, updatedAt?: string | null): Promise<string | null> {
  return cache.obtenir(photoPath, updatedAt);
}
