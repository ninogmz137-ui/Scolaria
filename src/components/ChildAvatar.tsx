/**
 * ChildAvatar — Renders a child's avatar as a themed circle.
 *
 * Supports three modes:
 * - 'initials': Accent-colored circle with white first letter
 * - 'emoji': Lighter accent circle with emoji centered
 * - 'photo': Circular cropped photo with accent border
 *
 * Used in: topbar, burger menu, child selector.
 */

import { View, Text, Image, StyleSheet } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';

interface ChildAvatarProps {
  /** Child's display name (used for initials fallback) */
  name: string;
  /** Emoji string (e.g. '👧') — if provided, renders in emoji mode */
  emoji?: string;
  /** Photo URI — if provided, renders in photo mode */
  photoUri?: string;
  /** Theme accent color */
  accentColor: string;
  /** Circle diameter, default 36 */
  size?: number;
  /** Show a small burger indicator overlay */
  showBurgerBadge?: boolean;
}

export default function ChildAvatar({
  name,
  emoji,
  photoUri,
  accentColor,
  size = 36,
  showBurgerBadge = false,
}: ChildAvatarProps) {
  const borderRadius = size / 2;
  const fontSize = size * 0.42;
  const emojiSize = size * 0.5;

  // Determine render mode: photo > emoji > initials
  const mode = photoUri ? 'photo' : emoji ? 'emoji' : 'initials';

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {mode === 'photo' ? (
        <Image
          source={{ uri: photoUri }}
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius,
              borderWidth: 2,
              borderColor: accentColor,
            },
          ]}
        />
      ) : mode === 'emoji' ? (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: accentColor + '20',
              borderWidth: 2,
              borderColor: accentColor + '40',
            },
          ]}
        >
          <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
        </View>
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: accentColor,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Burger badge — small ☰ indicator */}
      {showBurgerBadge && (
        <View
          style={[
            styles.burgerBadge,
            {
              backgroundColor: 'rgba(0,0,0,0.5)',
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: size * 0.2,
              bottom: -2,
              right: -2,
            },
          ]}
        >
          <Text style={{ color: '#FFFFFF', fontSize: size * 0.2, fontFamily: FontFamily.sansBold }}>☰</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansBold,
  },
  burgerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
