/**
 * Generate Scolaria app icon as SVG
 *
 * Creates an icon with "S" letter, gradient background,
 * and an orbital ring around it symbolizing the "ia" intelligence.
 *
 * Run: node scripts/generate-icon.js
 * Output: assets/icon-generated.svg
 */

const fs = require('fs');
const path = require('path');

const SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6D28D9"/>
      <stop offset="50%" stop-color="#1A1F3D"/>
      <stop offset="100%" stop-color="#0B0F2A"/>
    </linearGradient>
    <!-- Orbit gradient -->
    <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6D28D9"/>
      <stop offset="100%" stop-color="#22D3EE"/>
    </linearGradient>
    <!-- Dot gradient -->
    <radialGradient id="dot">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </radialGradient>
    <!-- Glow filter -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="224" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.03">
    ${Array.from({ length: 20 }, (_, i) =>
      `<line x1="${i * 55}" y1="0" x2="${i * 55}" y2="1024" stroke="white" stroke-width="1"/>`
    ).join('\n    ')}
    ${Array.from({ length: 20 }, (_, i) =>
      `<line x1="0" y1="${i * 55}" x2="1024" y2="${i * 55}" stroke="white" stroke-width="1"/>`
    ).join('\n    ')}
  </g>

  <!-- Orbital ring -->
  <ellipse cx="512" cy="512" rx="340" ry="340"
    fill="none" stroke="url(#orbit)" stroke-width="4"
    stroke-dasharray="12 8" opacity="0.35"
    transform="rotate(-20 512 512)"/>

  <!-- Inner ring -->
  <ellipse cx="512" cy="512" rx="280" ry="280"
    fill="none" stroke="#6D28D9" stroke-width="2"
    opacity="0.15"/>

  <!-- Orbiting dot (top) -->
  <circle cx="512" cy="172" r="18" fill="url(#dot)" filter="url(#glow)"/>

  <!-- Orbiting dot (bottom-right) -->
  <circle cx="800" cy="620" r="12" fill="#22D3EE" opacity="0.6"/>

  <!-- Letter S -->
  <text x="512" y="560" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="380" font-weight="900" fill="white"
    letter-spacing="-10">S</text>

  <!-- Small "ia" text -->
  <text x="680" y="680" text-anchor="start"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="120" font-weight="700" fill="#22D3EE"
    opacity="0.9">ia</text>

  <!-- Star symbol -->
  <text x="810" y="620" text-anchor="middle"
    font-family="system-ui, sans-serif"
    font-size="40" fill="#22D3EE" opacity="0.8">✦</text>
</svg>`;

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'icon-scolaria.svg');
fs.writeFileSync(outPath, SVG);
console.log('✅ Icône SVG générée :', outPath);
console.log('');
console.log('Pour convertir en PNG (1024x1024) :');
console.log('  - Ouvre le SVG dans un navigateur et fais un screenshot');
console.log('  - Ou utilise un outil en ligne : svgtopng.com');
