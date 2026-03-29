/**
 * LogoScolaria — Brand wordmark logo.
 *
 * "Scolar" in Lora Bold (serif) + "ia" in DM Sans Medium (sans-serif)
 * with accent color + tiny ✦ sparkle + accent underline on "ia".
 *
 * The serif/sans contrast creates a distinctive logo feel
 * without needing a custom typeface.
 */

import { View } from 'react-native';
import { Box, Text } from './ui';
import { FontFamily } from '../hooks/useSolariaFonts';

interface LogoScolariaProps {
  /** Font size in pixels. Default 22 */
  size?: number;
  /** Show subtitle under the logo */
  showSubtitle?: boolean;
  /** Color variant: 'dark' for dark backgrounds, 'light' for light backgrounds */
  variant?: 'dark' | 'light';
}

export default function LogoScolaria({
  size = 22,
  showSubtitle = false,
  variant = 'dark',
}: LogoScolariaProps) {
  const mainColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const iaColor = variant === 'dark' ? '#22D3EE' : '#6366F1';
  const sparkleColor = variant === 'dark' ? '#22D3EE' : '#6366F1';
  const subtitleColor = variant === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.45)';
  const underlineColor = variant === 'dark' ? '#22D3EE' : '#6366F1';

  const sparkleSize = Math.max(size * 0.32, 7);
  const underlineHeight = Math.max(size * 0.1, 2);
  const underlineWidth = size * 0.95;

  return (
    <Box className="items-center">
      <Box className="flex-row items-baseline">
        {/* "Scolar" — Lora Bold serif for logo gravitas */}
        <Text
          style={{
            fontFamily: FontFamily.loraBold,
            fontSize: size,
            color: mainColor,
            letterSpacing: -0.3,
          }}
        >
          Scolar
        </Text>

        {/* "ia" — DM Sans Medium, accent color, with underline */}
        <View>
          <Box className="flex-row items-baseline">
            <Text
              style={{
                fontFamily: FontFamily.sansMedium,
                fontSize: size,
                color: iaColor,
                letterSpacing: 0.3,
              }}
            >
              ia
            </Text>
            {/* Sparkle ✦ */}
            <Text
              style={{
                fontSize: sparkleSize,
                color: sparkleColor,
                marginLeft: 2,
                marginBottom: size * 0.35,
              }}
            >
              ✦
            </Text>
          </Box>
          {/* Accent underline under "ia" */}
          <View
            style={{
              height: underlineHeight,
              width: underlineWidth,
              borderRadius: underlineHeight,
              backgroundColor: underlineColor,
              opacity: 0.6,
              marginTop: -2,
            }}
          />
        </View>
      </Box>

      {showSubtitle && (
        <Text
          style={{
            fontFamily: FontFamily.sansRegular,
            color: subtitleColor,
            fontSize: Math.max(size * 0.48, 10),
            letterSpacing: 0.8,
            marginTop: 4,
          }}
        >
          Le copilote éducatif des familles
        </Text>
      )}
    </Box>
  );
}
