/**
 * ScolariaAppIcon.tsx  —  ICÔNE APP FINALE
 * ─────────────────────────────────────────────────────────────────────────────
 * Icône application Scolaria · Direction 01
 *
 * Design :
 *   • Fond blanc pur #FFFFFF
 *   • S majuscule Rufina Bold 700, couleur #000000
 *   • ✦ sparkle gradient violet→cyan en position de point de ponctuation
 *     (baseline alignée avec celle du S, juste après la lettre)
 *
 * Usage React Native :
 *   <ScolariaAppIcon />              → 60px par défaut
 *   <ScolariaAppIcon size={120} />   → version preview ou splash
 *
 * ⚠️  POUR LE FICHIER ICON OFFICIEL iOS/Android :
 *   Ne pas générer l'icône via ce composant à l'export.
 *   Utiliser le SVG/PNG téléchargé depuis scolaria-app-icon-final.html
 *   et le placer dans /assets/icon.png + /assets/adaptive-icon.png.
 *
 *   Ce composant sert uniquement pour AFFICHER l'icône DANS l'app
 *   (ex: about screen, splash interne, settings).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useId } from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

interface ScolariaAppIconProps {
  /**
   * Taille de l'icône en pixels (carré).
   * @default 60
   */
  size?: number;

  /**
   * Afficher le fond blanc avec coins arrondis iOS-style.
   * Mettre à false si l'icône est dans un conteneur qui gère déjà le fond.
   * @default true
   */
  withBackground?: boolean;
}

export default function ScolariaAppIcon({
  size = 60,
  withBackground = true,
}: ScolariaAppIconProps) {

  const uid = useId().replace(/:/g, '');

  // Coins arrondis iOS : ratio standard 22.37%
  const cornerRadius = 22.37;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient
          id={`spark-${uid}`}
          x1={70}
          y1={0}
          x2={86}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#7C3AED" stopOpacity={1} />
          <Stop offset="1" stopColor="#06B6D4" stopOpacity={1} />
        </LinearGradient>
      </Defs>

      {/* Fond blanc avec coins arrondis iOS */}
      {withBackground && (
        <Rect
          width={100}
          height={100}
          rx={cornerRadius}
          ry={cornerRadius}
          fill="#FFFFFF"
        />
      )}

      {/*
        S Rufina Bold 700 — couleur noire pure
        Centré horizontalement (text-anchor middle, x=44 légèrement à gauche
        pour laisser place au sparkle à droite).
        Baseline à y=78.
      */}
      <SvgText
        x={44}
        y={78}
        fontFamily="Rufina-Bold"
        fontSize={80}
        fontWeight="700"
        fill="#000000"
        textAnchor="middle"
      >
        S
      </SvgText>

      {/*
        ✦ sparkle gradient — point de ponctuation
        - x=78 : juste après le S
        - y=78 : MÊME baseline que le S (alignement typographique strict)
        - fontSize=14 : ≈ 17.5% du S, taille standard d'un point de ponctuation
        - text-anchor middle pour centrage propre du caractère ✦
      */}
      <SvgText
        x={78}
        y={78}
        fontFamily="Rufina-Bold"
        fontSize={14}
        fontWeight="700"
        fill={`url(#spark-${uid})`}
        textAnchor="middle"
      >
        ✦
      </SvgText>
    </Svg>
  );
}

/*
─────────────────────────────────────────────────────────────────────────────
USAGE TYPIQUE

  Settings → "À propos" :
    <ScolariaAppIcon size={80} />

  Onboarding splash :
    <ScolariaAppIcon size={120} />

  Email signature, header tab :
    <ScolariaAppIcon size={32} />

  Sans fond (déjà géré par le parent) :
    <ScolariaAppIcon size={60} withBackground={false} />

─────────────────────────────────────────────────────────────────────────────
ICÔNE OFFICIELLE iOS/ANDROID

  Pour l'icône système (home screen, App Store, Play Store) :

  1. Télécharger PNG 1024×1024 depuis scolaria-app-icon-final.html
  2. Placer dans /assets/icon.png
  3. Pour Android adaptive icon :
     - Foreground : juste le S + ✦ (sans le fond blanc)
     - Background : #FFFFFF
     → /assets/adaptive-icon.png

  4. Dans app.json :
     "icon": "./assets/icon.png",
     "android": {
       "adaptiveIcon": {
         "foregroundImage": "./assets/adaptive-icon.png",
         "backgroundColor": "#FFFFFF"
       }
     }

─────────────────────────────────────────────────────────────────────────────
TROUBLESHOOTING

  Sparkle transparent → react-native-svg < 13.4 → npm install @latest
  Police pas chargée  → vérifier 'Rufina-Bold' dans useFonts
  Icône floue à 29px  → utiliser le PNG officiel, pas ce composant
─────────────────────────────────────────────────────────────────────────────
*/
