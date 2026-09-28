/**
 * Ouvrir un fichier du carnet SANS copie publique (L6, bloquant « avant toute famille réelle »).
 *
 * Constat du 26 sept : « Voir le fichier » ouvrait l'URL signée dans Chrome, qui téléchargeait le document
 * dans les Téléchargements PUBLICS du téléphone. Désormais :
 * - image : affichée DANS l'app (écran Visionneuse) depuis l'URL signée d'1 h — aucun fichier écrit hors
 *   du cache privé de l'app ;
 * - PDF : téléchargé dans le cache PRIVÉ de l'app (Paths.cache/carnet-ouverture), puis ouvert par la
 *   visionneuse du système : Android = intent VIEW sur un content:// (lecture accordée à la seule app
 *   choisie, sans copie publique) ; iOS = feuille système de l'app (aperçu, « Ouvrir dans… »).
 * Les fichiers ouverts précédemment sont effacés à chaque nouvelle ouverture et au démarrage.
 */

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { lienFichier, type ElementCarnet } from './carnetService';

const NOM_DOSSIER = 'carnet-ouverture';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export type Ouverture =
  | { type: 'image'; url: string; titre: string }
  | { type: 'ouvert' }
  | { type: 'erreur'; message: string };

/** Efface les fichiers ouverts précédemment (cache privé de l'app). */
export function viderFichiersOuverts(): void {
  try {
    const d = new Directory(Paths.cache, NOM_DOSSIER);
    if (d.exists) d.delete();
  } catch {
    // Rien à effacer, ou fichier encore utilisé par la visionneuse : effacé à la prochaine ouverture.
  }
}

function extension(e: ElementCarnet): string {
  const m = /\.([a-z0-9]+)$/i.exec(e.fichier ?? '');
  return (m?.[1] ?? 'pdf').toLowerCase();
}

export async function ouvrirFichierCarnet(e: ElementCarnet, demo: boolean): Promise<Ouverture> {
  const url = await lienFichier(e, demo);
  if (!url) return { type: 'erreur', message: 'Ce fichier n’est pas disponible pour le moment. Réessayez.' };
  const mime = e.mime ?? (extension(e) === 'pdf' ? 'application/pdf' : 'image/jpeg');

  if (mime.startsWith('image/')) return { type: 'image', url, titre: e.titre };

  try {
    let fichier: File;
    if (url.startsWith('file:')) {
      // Démo : le fichier est déjà dans le stockage privé de l'app.
      fichier = new File(url);
    } else {
      viderFichiersOuverts();
      const dossier = new Directory(Paths.cache, NOM_DOSSIER);
      dossier.create({ intermediates: true, idempotent: true });
      fichier = await File.downloadFileAsync(url, new File(dossier, `${e.id}.${extension(e)}`));
    }
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: fichier.contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: mime,
      });
    } else {
      await Sharing.shareAsync(fichier.uri, { mimeType: mime, UTI: mime === 'application/pdf' ? 'com.adobe.pdf' : undefined });
    }
    return { type: 'ouvert' };
  } catch {
    return {
      type: 'erreur',
      message:
        Platform.OS === 'android'
          ? 'Aucune application de ce téléphone ne peut ouvrir ce document (installez un lecteur de PDF).'
          : 'Le document n’a pas pu être ouvert. Réessayez.',
    };
  }
}
