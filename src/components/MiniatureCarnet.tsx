/**
 * MiniatureCarnet — vignette carrée d'une image du carnet (Messages, Accueil).
 * Démo : fichier local ; compte réel : URL signée d'1 h (lienFichier). Placeholder ardoise (icône image) tant que
 * l'URL n'est pas là et si le chargement échoue : jamais de case vide ni d'erreur à l'écran.
 */

import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Image as ImageIcone } from 'lucide-react-native';
import { useDemoData } from '../contexts/DemoContext';
import { lienFichier, type ElementCarnet } from '../services/carnetService';
import { TEINTES } from '../theme/categories';

/** Vrai si l'élément a une image à montrer (les PDF n'ont pas de vignette). */
export function aUneImage(e: Pick<ElementCarnet, 'fichier' | 'mime'>): boolean {
  return !!e.fichier && !!e.mime?.startsWith('image/');
}

export default function MiniatureCarnet({
  element,
  taille,
  rayon = 10,
}: {
  element: ElementCarnet;
  taille: number;
  rayon?: number;
}) {
  const { isDemoMode } = useDemoData();
  const [uri, setUri] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    let annule = false;
    setUri(null);
    setEchec(false);
    if (!aUneImage(element)) return;
    lienFichier(element, isDemoMode)
      .then((u) => {
        if (annule) return;
        if (u) setUri(u);
        else setEchec(true);
      })
      .catch(() => {
        if (!annule) setEchec(true);
      });
    return () => {
      annule = true;
    };
  }, [element.fichier, element.mime, isDemoMode]);

  const ardoise = TEINTES.ardoise;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: taille,
        height: taille,
        borderRadius: rayon,
        overflow: 'hidden',
        backgroundColor: ardoise.fond,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri && !echec ? (
        <Image
          source={{ uri }}
          style={{ width: taille, height: taille }}
          resizeMode="cover"
          onError={() => setEchec(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <ImageIcone size={Math.round(taille * 0.4)} strokeWidth={2} color={ardoise.icone} />
      )}
    </View>
  );
}
