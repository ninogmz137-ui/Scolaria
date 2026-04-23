/**
 * ScolariaLogo — Rufina Bold · Scolar + ı + a + ✦
 *
 * ✦ en #4338CA (indigo) plein — cohérent avec ScolariaSymbol.
 * Dégradé violet/cyan réservé au halo Aria (interactions), pas au logo.
 *
 * Police : `FontFamily.rufinaBold` (@expo-google-fonts/rufina), chargée dans `useSolariaFonts`.
 */

import React from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';
import { FontFamily } from '../hooks/useSolariaFonts';

const SCOLAR_RATIO    = 2.88;
const DOTLESS_I_RATIO = 0.30;
const A_RATIO         = 0.55;
const HEIGHT_RATIO    = 1.40;
const BASELINE_RATIO  = 1.08;
const SPARK_FS_RATIO  = 0.205;
const SPARK_Y_RATIO   = 0.77;

export interface ScolariaLogoProps {
  /** @default 48 */
  fontSize?: number;
  /** Glyphes Scolar + ı + a. @default '#1A2340' — sur fond sombre : `#FFFFFF` */
  primaryColor?: string;
  /** ✦ @default '#4338CA' */
  sparkleColor?: string;
  /** @default false */
  debugMode?: boolean;
}

export default function ScolariaLogo({
  fontSize     = 48,
  primaryColor = '#1A2340',
  sparkleColor = '#4338CA',
  debugMode    = false,
}: ScolariaLogoProps) {
  const scolarW  = SCOLAR_RATIO * fontSize;
  const iW       = DOTLESS_I_RATIO * fontSize;
  const aW       = A_RATIO * fontSize;
  const totalW   = scolarW + iW + aW;
  const height   = HEIGHT_RATIO * fontSize;
  const baseline = BASELINE_RATIO * fontSize;

  const sparkFS = SPARK_FS_RATIO * fontSize;
  const sparkX  = scolarW + iW / 2;
  const sparkY  = baseline - SPARK_Y_RATIO * fontSize;

  return (
    <Svg width={totalW} height={height} viewBox={`0 0 ${totalW} ${height}`}>
      <SvgText
        x={0}
        y={baseline}
        fontFamily={FontFamily.rufinaBold}
        fontSize={fontSize}
        fill={primaryColor}
      >
        Scolar
      </SvgText>
      <SvgText
        x={scolarW}
        y={baseline}
        fontFamily={FontFamily.rufinaBold}
        fontSize={fontSize}
        fill={primaryColor}
      >
        {'\u0131'}
      </SvgText>
      <SvgText
        x={scolarW + iW}
        y={baseline}
        fontFamily={FontFamily.rufinaBold}
        fontSize={fontSize}
        fill={primaryColor}
      >
        a
      </SvgText>
      <SvgText
        x={sparkX}
        y={sparkY}
        fontFamily={FontFamily.rufinaBold}
        fontSize={sparkFS}
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
