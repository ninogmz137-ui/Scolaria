/**
 * LogoScolaria — Wordmark fidèle au brand v2.
 *
 * "SCOL" condensed bold blanc + "aria" lowercase dégradé violet→cyan
 * + étoile 4 branches SVG au-dessus du "a" de "aria".
 *
 * Rendu 100% SVG → gradient natif, scalable, zéro dépendance image.
 *
 * Props :
 *   size    — hauteur de référence du texte en px (défaut 48)
 *   variant — 'dark' (fond sombre, SCOL blanc) | 'light' (fond clair, SCOL navy)
 */

import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Path,
  G,
} from 'react-native-svg';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Proportions calées sur le mockup ───────────────────
// viewBox référence : 252 × 60
// SCOL  : BarlowCondensed ExtraBold 50px, baseline y=48
// aria  : DMSans Medium 44px, baseline y=48, x=111
// étoile: rayon 7px, centrée à (116, 10)
const VB_W = 252;
const VB_H = 60;

interface Props {
  /** Hauteur rendue en pixels (largeur calculée proportionnellement). Défaut 48. */
  size?: number;
  variant?: 'dark' | 'light';
}

export default function LogoScolaria({ size = 48, variant = 'dark' }: Props) {
  const scolColor = variant === 'dark' ? '#FFFFFF' : '#0B1628';
  const ratio     = size / VB_H;
  const svgW      = VB_W * ratio;

  return (
    <Svg
      width={svgW}
      height={size}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
    >
      <Defs>
        {/* Dégradé horizontal violet → cyan pour "aria" */}
        <LinearGradient id="ariaGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor="#6366F1" stopOpacity="1" />
          <Stop offset="1"   stopColor="#22D3EE" stopOpacity="1" />
        </LinearGradient>
        {/* Même dégradé diagonal pour l'étoile */}
        <LinearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"   stopColor="#6366F1" stopOpacity="1" />
          <Stop offset="1"   stopColor="#22D3EE" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* SCOL — condensed extra bold, majuscules */}
      <SvgText
        x="0"
        y="48"
        fill={scolColor}
        fontFamily={FontFamily.displayExtraBold}
        fontSize="50"
        letterSpacing="1.5"
      >
        SCOL
      </SvgText>

      {/* aria — DM Sans medium, lowercase, gradient */}
      <SvgText
        x="111"
        y="48"
        fill="url(#ariaGrad)"
        fontFamily={FontFamily.sansMedium}
        fontSize="44"
        letterSpacing="0.5"
      >
        aria
      </SvgText>

      {/* Étoile 4 branches au-dessus du "a" de "aria" */}
      {/* Chemin : croix avec pointes effilées via courbes de Bézier */}
      <G transform="translate(117, 10)">
        <Path
          d="M0 -7.5 C1.8 -1.8 1.8 -1.8 7.5 0 C1.8 1.8 1.8 1.8 0 7.5 C-1.8 1.8 -1.8 1.8 -7.5 0 C-1.8 -1.8 -1.8 -1.8 0 -7.5 Z"
          fill="url(#starGrad)"
        />
      </G>
    </Svg>
  );
}
