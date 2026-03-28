/**
 * LogoScolaria — Brand logo component
 *
 * Renders the official Scolaria logo (wordmark with orbit).
 * The logo is the designer's final version with transparent background,
 * optimized for dark and light backgrounds.
 *
 * Usage:
 *   <LogoScolaria size={48} />
 *   <LogoScolaria size={120} showSubtitle />
 *   <LogoScolaria size={32} variant="light" />
 */

import { Image } from 'react-native';
import { Box, Text } from './ui';
import { Colors } from '../constants/colors';

// ─── Logo assets (designer's final version) ──────────────
const LOGO_DARK = require('../../assets/logo-scolaria.png');
const LOGO_LIGHT = require('../../assets/logo-scolaria-light.png');

interface LogoScolariaProps {
  /** Logo height in pixels (width auto-scales to aspect ratio ~1.6:1). Default 48 */
  size?: number;
  /** Show subtitle "Passeport scolaire numerique" under the logo */
  showSubtitle?: boolean;
  /** Color variant for subtitle text */
  variant?: 'dark' | 'light';
}

export default function LogoScolaria({
  size = 48,
  showSubtitle = false,
  variant = 'dark',
}: LogoScolariaProps) {
  // 'dark' variant = dark background → use light (white) logo
  // 'light' variant = light background → use dark (navy) logo
  const logoSource = variant === 'dark' ? LOGO_LIGHT : LOGO_DARK;
  const subtitleColor = variant === 'dark' ? Colors.gray : 'rgba(11,15,42,0.5)';
  // Logo aspect ratio is approximately 1206:1191 ≈ square, but the wordmark
  // content is wider than tall, so we give extra width
  const logoWidth = size * 2.2;
  const logoHeight = size;

  return (
    <Box className="items-center">
      <Image
        source={logoSource}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
      {showSubtitle && (
        <Text
          className="font-medium mt-1"
          style={{
            color: subtitleColor,
            fontSize: Math.max(size * 0.22, 11),
            letterSpacing: 0.5,
          }}
        >
          Passeport scolaire numerique
        </Text>
      )}
    </Box>
  );
}
