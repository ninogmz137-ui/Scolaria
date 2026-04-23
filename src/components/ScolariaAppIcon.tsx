/**
 * ScolariaAppIcon — Icône d’app (symbole couronne d’ellipses).
 * Aligné sur `ScolariaSymbol` · indigo #4338CA sur fond blanc en tuile.
 *
 * Usage in-app (À propos, réglages, etc.) — **pas** pour exporter les stores :
 * générer le PNG 1024×1024 (symbole centré, fond #FFFFFF) et placer `assets/icon.png`.
 */

import { View, StyleSheet, type ViewStyle } from 'react-native';
import ScolariaSymbol from './ScolariaSymbol';

const DEFAULT_SYMBOL = '#4338CA';
const DEFAULT_BG = '#FFFFFF';

export interface ScolariaAppIconProps {
  /** Taille du carré (px). @default 60 */
  size?: number;
  /**
   * true — fond blanc, coins iOS (≈ 22,4 % du côté).
   * false — seul le symbole (adaptive icon foreground, header sombre, etc.).
   * @default true
   */
  withBackground?: boolean;
  /** Couleur du symbole. @default #4338CA */
  color?: string;
  /** Fond si `withBackground`. @default #FFFFFF */
  backgroundColor?: string;
  style?: ViewStyle;
}

export default function ScolariaAppIcon({
  size = 60,
  withBackground = true,
  color = DEFAULT_SYMBOL,
  backgroundColor = DEFAULT_BG,
  style,
}: ScolariaAppIconProps) {
  const padding = withBackground ? size * 0.2 : 0;
  const symbolSize = Math.max(10, Math.round(size - 2 * padding));

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: withBackground ? size * 0.2237 : 0,
          backgroundColor: withBackground ? backgroundColor : 'transparent',
        },
        style,
      ]}
      accessibilityLabel="Scolaria"
    >
      <ScolariaSymbol size={symbolSize} color={color} entrance="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

/*
──────────────────────────────────────────────────────────────────────────
PNG iOS / Android (stores)

1. Exporter 1024×1024 : symbole #4338CA centré, fond #FFFFFF, coins optionnels
   selon charte.
2. `assets/icon.png` + splash (Expo) ; Android adaptive : même foreground
   sur fond #FFFFFF, ou `withBackground={false}` capturé sur fond transparent
   + `backgroundColor` dans app.json.
──────────────────────────────────────────────────────────────────────────
*/
