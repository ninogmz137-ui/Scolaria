/**
 * ScolariaSymbol.tsx — SYMBOLE IDENTITAIRE FINAL ✓
 * ─────────────────────────────────────────────────────────────────────
 * Symbole Scolaria validé · Couronne 4+4 · Ellipses organiques
 *
 * Structure :
 *   · 4 grandes ellipses (rx=10 ry=20) = 4 cycles scolaires
 *     (maternelle · primaire · collège · lycée)
 *   · 4 petites ellipses (rx=8 ry=14) = 4 dimensions transverses
 *     (parents · enseignants · mémoire · Aria)
 *   · Rotation globale 22.5° + twist individuel +8° par élément
 *   · Centre vide = l'enfant au cœur, que Scolaria entoure
 *
 * Couleur :
 *   · Indigo #4338CA = couleur signature du symbole
 *   · Blanc sur fond coloré (indigo, navy, noir)
 *   · RÈGLE : blanc & noir dominent dans l'app,
 *     l'indigo est une touche, pas la couleur dominante
 * ─────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import Svg, { Ellipse } from 'react-native-svg';

export interface ScolariaSymbolProps {
  /** Taille du symbole en pixels (carré). @default 48 */
  size?: number;
  /** Couleur du symbole. @default '#4338CA' */
  color?: string;
  /** Compat: certaines vues passent encore `entrance`. */
  entrance?: 'none' | 'assemble';
}

const GLOBAL_ROTATION = 22.5;
const LARGE_ANGLES = [8, 98, 188, 278] as const;
const SMALL_ANGLES = [53, 143, 233, 323] as const;

/** Géométrie de référence (icône officielle), dans un viewBox -100..100. */
const REFERENCE = {
  large: { rx: 10, ry: 20, cy: -66 },
  small: { rx: 8, ry: 14, cy: -62 },
};

/**
 * Géométrie « petite taille » (< 32 px) : même composition (8 ellipses, mêmes angles),
 * ellipses plus pleines et couronne resserrée. À 14 px, la géométrie de référence donne
 * des ellipses de 1,4 × 2,8 px qui se lisent comme des tirets.
 */
const COMPACT = {
  large: { rx: 16, ry: 28, cy: -60 },
  small: { rx: 13, ry: 21, cy: -58 },
};

export const COMPACT_BELOW = 32;

/**
 * Les 8 ellipses de la couronne, à placer dans un <Svg viewBox="-100 -100 200 200">.
 * Partagé avec AriaOrb : une seule définition du symbole dans l'app.
 * Une seule rotation par ellipse, en transform SVG (centre = origine du viewBox) :
 * pas de <G rotation originX> imbriqués, mal rendus par react-native-svg sur Android.
 */
export function CrownShapes({ color, compact = false }: { color: string; compact?: boolean }) {
  const g = compact ? COMPACT : REFERENCE;
  return (
    <>
      {LARGE_ANGLES.map((angle) => (
        <Ellipse
          key={`large-${angle}`}
          cx={0}
          cy={g.large.cy}
          rx={g.large.rx}
          ry={g.large.ry}
          fill={color}
          transform={`rotate(${GLOBAL_ROTATION + angle})`}
        />
      ))}
      {SMALL_ANGLES.map((angle) => (
        <Ellipse
          key={`small-${angle}`}
          cx={0}
          cy={g.small.cy}
          rx={g.small.rx}
          ry={g.small.ry}
          fill={color}
          transform={`rotate(${GLOBAL_ROTATION + angle})`}
        />
      ))}
    </>
  );
}

export default function ScolariaSymbol({ size = 48, color = '#4338CA' }: ScolariaSymbolProps) {
  return (
    <Svg width={size} height={size} viewBox="-100 -100 200 200">
      <CrownShapes color={color} compact={size < COMPACT_BELOW} />
    </Svg>
  );
}
