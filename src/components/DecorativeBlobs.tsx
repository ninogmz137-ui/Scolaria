/**
 * DecorativeBlobs — Accent-colored circle blobs in corners.
 *
 * Two blobs: top-left and top-right, partially off-screen.
 * Uses the child theme accent color at 15% opacity.
 * Similar to French education apps (blobs in corners).
 */

import { Box } from './ui';

interface Props {
  accent: string;
  /** Blob size in px (default 90) */
  size?: number;
  /** Opacity 0–1 (default 0.15) */
  opacity?: number;
}

export default function DecorativeBlobs({ accent, size = 90, opacity = 0.15 }: Props) {
  return (
    <>
      {/* Top-left blob */}
      <Box
        className="absolute"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent,
          opacity,
          top: -size * 0.3,
          left: -size * 0.25,
        }}
        pointerEvents="none"
      />
      {/* Top-right blob — slightly smaller */}
      <Box
        className="absolute"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          borderRadius: (size * 0.75) / 2,
          backgroundColor: accent,
          opacity: opacity * 0.8,
          top: -size * 0.15,
          right: -size * 0.2,
        }}
        pointerEvents="none"
      />
    </>
  );
}
