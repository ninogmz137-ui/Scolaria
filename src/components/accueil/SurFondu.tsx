/**
 * SurFondu — enveloppe d'un texte posé en haut de l'Accueil : il mesure sa position et prend le ton lisible
 * sur la partie du fondu qui est derrière lui (la position dépend du contenu et de la barre d'état).
 * `LibelleSurFondu` : label de section (COMPONENTS §10) qui suit ce ton.
 */

import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { tonSurFondu } from '../../utils/fondu';
import LibelleSection from '../LibelleSection';

export const TON_STYLE: Record<'clair' | 'fonce', TextStyle> = {
  clair: { color: '#FFFFFF' },
  fonce: { color: 'rgba(15,23,42,0.55)' },
};

export default function SurFondu({
  hauteur,
  children,
}: {
  hauteur: number;
  children: (ton: StyleProp<TextStyle>) => ReactNode;
}) {
  const [ton, setTon] = useState<'clair' | 'fonce' | null>(null);
  const onLayout = (ev: LayoutChangeEvent) => {
    const { y, height } = ev.nativeEvent.layout;
    setTon(tonSurFondu(y + height / 2, hauteur));
  };
  return <View onLayout={onLayout}>{children(ton ? TON_STYLE[ton] : null)}</View>;
}

export function LibelleSurFondu({ texte, hauteur, premier }: { texte: string; hauteur: number; premier?: boolean }) {
  return <SurFondu hauteur={hauteur}>{(ton) => <LibelleSection texte={texte} premier={premier} ton={ton} />}</SurFondu>;
}
