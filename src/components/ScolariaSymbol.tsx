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
import Svg, { G, Ellipse } from 'react-native-svg';

export interface ScolariaSymbolProps {
  /** Taille du symbole en pixels (carré). @default 48 */
  size?: number;
  /** Couleur du symbole. @default '#4338CA' */
  color?: string;
}

const LARGE_ANGLES = [8, 98, 188, 278] as const;
const SMALL_ANGLES = [53, 143, 233, 323] as const;

const LARGE_RX = 10;
const LARGE_RY = 20;
const LARGE_CY = -66;

const SMALL_RX = 8;
const SMALL_RY = 14;
const SMALL_CY = -62;

export default function ScolariaSymbol({ size = 48, color = '#4338CA' }: ScolariaSymbolProps) {
  return (
    <Svg width={size} height={size} viewBox="-100 -100 200 200">
      <G rotation={22.5} originX={0} originY={0}>
        {LARGE_ANGLES.map((angle) => (
          <G key={`large-${angle}`} rotation={angle} originX={0} originY={0}>
            <Ellipse cx={0} cy={LARGE_CY} rx={LARGE_RX} ry={LARGE_RY} fill={color} />
          </G>
        ))}

        {SMALL_ANGLES.map((angle) => (
          <G key={`small-${angle}`} rotation={angle} originX={0} originY={0}>
            <Ellipse cx={0} cy={SMALL_CY} rx={SMALL_RX} ry={SMALL_RY} fill={color} />
          </G>
        ))}
      </G>
    </Svg>
  );
}
