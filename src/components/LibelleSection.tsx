/**
 * LibelleSection — label de section d'Accueil, Suivi et Messages (COMPONENTS §10) :
 * Figtree 600 · 13px · casse normale · rgba(15,23,42,0.55) · padding 18px 6px 8px
 * (+ 14 de gouttière : le libellé s'aligne sur le texte des cartes).
 * Une marge « entre sections » ne s'applique pas à la première : `premier` retire les 18px du haut.
 */

import { Text } from './ui';
import { FontFamily } from '../hooks/useSolariaFonts';

export default function LibelleSection({ texte, premier = false }: { texte: string; premier?: boolean }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: FontFamily.sansSemiBold,
        fontSize: 13,
        lineHeight: 18,
        color: 'rgba(15,23,42,0.55)',
        paddingHorizontal: 20,
        paddingTop: premier ? 0 : 18,
        paddingBottom: 8,
      }}
    >
      {texte}
    </Text>
  );
}
