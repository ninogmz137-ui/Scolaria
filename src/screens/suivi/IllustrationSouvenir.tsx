/**
 * IllustrationSouvenir — illustrations de DÉMO dessinées pour l'app (SVG, style dessin d'enfant).
 * Règle : jamais de photo d'enfant réel dans la démo. Rien n'est téléchargé.
 */

import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { ElementCarnet } from '../../services/carnetService';

type Sujet = NonNullable<ElementCarnet['illustration']>;

const TRAIT = { stroke: '#0F172A', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export default function IllustrationSouvenir({ sujet }: { sujet: Sujet }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 120" accessibilityLabel={`Illustration : ${sujet}`}>
      <Rect x="0" y="0" width="160" height="120" fill="#F8F7F4" />
      {sujet === 'maison' && (
        <>
          <Circle cx="130" cy="24" r="12" fill="#FCD34D" {...TRAIT} />
          <Rect x="45" y="55" width="60" height="45" fill="#FDE7D5" {...TRAIT} />
          <Polygon points="38,58 75,28 112,58" fill="#F9A8A8" {...TRAIT} />
          <Rect x="68" y="76" width="16" height="24" fill="#C4B5A5" {...TRAIT} />
          <Rect x="52" y="64" width="12" height="12" fill="#BFDBFE" {...TRAIT} />
          <Line x1="10" y1="100" x2="150" y2="100" {...TRAIT} />
        </>
      )}
      {sujet === 'arbre' && (
        <>
          <Rect x="72" y="62" width="14" height="38" fill="#C4A484" {...TRAIT} />
          <Circle cx="79" cy="48" r="28" fill="#BBD7A8" {...TRAIT} />
          <Circle cx="68" cy="44" r="4" fill="#F9A8A8" />
          <Circle cx="90" cy="54" r="4" fill="#F9A8A8" />
          <Circle cx="82" cy="34" r="4" fill="#F9A8A8" />
          <Line x1="20" y1="100" x2="140" y2="100" {...TRAIT} />
        </>
      )}
      {sujet === 'soleil' && (
        <>
          <Circle cx="80" cy="60" r="22" fill="#FCD34D" {...TRAIT} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return (
              <Line key={a} x1={80 + Math.cos(r) * 30} y1={60 + Math.sin(r) * 30} x2={80 + Math.cos(r) * 42} y2={60 + Math.sin(r) * 42} {...TRAIT} />
            );
          })}
          <Circle cx="73" cy="56" r="2.5" fill="#0F172A" />
          <Circle cx="87" cy="56" r="2.5" fill="#0F172A" />
          <Path d="M72 66 Q80 73 88 66" fill="none" {...TRAIT} />
        </>
      )}
      {sujet === 'fusee' && (
        <>
          <Circle cx="30" cy="25" r="2" fill="#0F172A" />
          <Circle cx="130" cy="40" r="2" fill="#0F172A" />
          <Circle cx="120" cy="95" r="2" fill="#0F172A" />
          <Path d="M80 14 C95 30 96 60 92 82 L68 82 C64 60 65 30 80 14 Z" fill="#E5E7EB" {...TRAIT} />
          <Circle cx="80" cy="45" r="8" fill="#BFDBFE" {...TRAIT} />
          <Polygon points="68,70 56,90 68,84" fill="#F9A8A8" {...TRAIT} />
          <Polygon points="92,70 104,90 92,84" fill="#F9A8A8" {...TRAIT} />
          <Path d="M72 84 Q80 106 88 84" fill="#FCD34D" {...TRAIT} />
        </>
      )}
      {sujet === 'classe' && (
        <>
          <Rect x="25" y="18" width="110" height="50" rx="4" fill="#CBD5C0" {...TRAIT} />
          <Path d="M40 36 L56 36 M40 48 L70 48 M86 32 Q98 24 110 32" fill="none" stroke="#F8F7F4" strokeWidth={2.5} strokeLinecap="round" />
          <Rect x="30" y="84" width="40" height="8" fill="#C4A484" {...TRAIT} />
          <Rect x="90" y="84" width="40" height="8" fill="#C4A484" {...TRAIT} />
          <Line x1="34" y1="92" x2="34" y2="108" {...TRAIT} />
          <Line x1="66" y1="92" x2="66" y2="108" {...TRAIT} />
          <Line x1="94" y1="92" x2="94" y2="108" {...TRAIT} />
          <Line x1="126" y1="92" x2="126" y2="108" {...TRAIT} />
        </>
      )}
      {sujet === 'medaille' && (
        <>
          <Polygon points="62,10 76,10 84,50 70,50" fill="#BFDBFE" {...TRAIT} />
          <Polygon points="98,10 84,10 76,50 90,50" fill="#C7D2FE" {...TRAIT} />
          <Circle cx="80" cy="74" r="26" fill="#FCD34D" {...TRAIT} />
          <Ellipse cx="80" cy="74" rx="14" ry="14" fill="none" {...TRAIT} />
          <Path d="M76 70 L80 66 L80 82" fill="none" {...TRAIT} />
        </>
      )}
    </Svg>
  );
}
