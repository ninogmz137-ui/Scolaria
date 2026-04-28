/**
 * ScolariaLogo.tsx  —  VERSION FINALE · A01
 * ─────────────────────────────────────────────────────────────────────────────
 * Design : Rufina Bold 700 · monochrome · ✦ indigo #4338CA solide sur le i
 *
 * ⚠️  DÉCISION 2026-04-20 : gradient violet→cyan remplacé par indigo #4338CA solide
 *   Cohérence avec ScolariaSymbol.tsx — une seule couleur accent partout
 *   Gradient indigo/cyan réservé au halo Aria en interaction uniquement
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useId } from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';

// ── Calibration Rufina Bold ──────────────────────────────────────────────────
// Si désalignement sur device : activer debugMode + ajuster SCOLAR_RATIO
const SCOLAR_RATIO = 2.88; // width("Scolar")  / fontSize
const DOTLESS_I_RATIO = 0.3; // width("ı")       / fontSize
const A_RATIO = 0.55; // width("a")       / fontSize
const HEIGHT_RATIO = 1.4; // hauteur SVG      / fontSize
const BASELINE_RATIO = 1.08; // baseline Y       / fontSize
const SPARK_FS_RATIO = 0.205; // taille sparkle   / fontSize
const SPARK_Y_RATIO = 0.77; // hauteur point i au-dessus baseline / fontSize

export interface ScolariaLogoProps {
  fontSize?: number; // @default 48
  primaryColor?: string; // @default '#1A2340' — blanc sur fonds sombres
  sparkleColor?: string; // @default '#4338CA' — indigo solide (plus de gradient)
  debugMode?: boolean; // @default false
}

export default function ScolariaLogo({
  fontSize = 48,
  primaryColor = '#1A2340',
  sparkleColor = '#4338CA',
  debugMode = false,
}: ScolariaLogoProps) {
  const uid = useId().replace(/:/g, '');
  void uid;

  const scolarW = SCOLAR_RATIO * fontSize;
  const iW = DOTLESS_I_RATIO * fontSize;
  const aW = A_RATIO * fontSize;
  const totalW = scolarW + iW + aW;
  const height = HEIGHT_RATIO * fontSize;
  const baseline = BASELINE_RATIO * fontSize;

  const sparkFS = SPARK_FS_RATIO * fontSize;
  const sparkX = scolarW + iW / 2;
  const sparkY = baseline - SPARK_Y_RATIO * fontSize;

  return (
    <Svg width={totalW} height={height} viewBox={`0 0 ${totalW} ${height}`} overflow="visible">
      <SvgText
        x={0}
        y={baseline}
        fontFamily="Rufina-Bold"
        fontSize={fontSize}
        fontWeight="700"
        fill={primaryColor}
      >
        Scolar
      </SvgText>

      <SvgText
        x={scolarW}
        y={baseline}
        fontFamily="Rufina-Bold"
        fontSize={fontSize}
        fontWeight="700"
        fill={primaryColor}
      >
        {'\u0131'}
      </SvgText>

      <SvgText
        x={scolarW + iW}
        y={baseline}
        fontFamily="Rufina-Bold"
        fontSize={fontSize}
        fontWeight="700"
        fill={primaryColor}
      >
        a
      </SvgText>

      <SvgText
        x={sparkX}
        y={sparkY}
        fontFamily="Rufina-Bold"
        fontSize={sparkFS}
        fontWeight="700"
        fill={sparkleColor}
        textAnchor="middle"
      >
        ✦
      </SvgText>

      {debugMode && (
        <SvgText x={0} y={height - 2} fontSize={fontSize * 0.1} fill="red">
          {`scW=${scolarW.toFixed(1)} iW=${iW.toFixed(1)} spX=${sparkX.toFixed(1)}`}
        </SvgText>
      )}
    </Svg>
  );
}
