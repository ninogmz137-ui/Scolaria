/**
 * EAS Build prebuild script — writes .env from OS environment variables.
 * Called via prebuildCommand in eas.json.
 * Uses Node.js (no bash/CRLF issues).
 */
const fs = require('fs');
const path = require('path');

const VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_ANTHROPIC_API_KEY',
  'EXPO_PUBLIC_GOOGLE_VISION_KEY',
];

const envPath = path.join(__dirname, '..', '.env');
const lines = [];

console.log('[write-env] Writing .env from OS environment...');

for (const name of VARS) {
  const value = process.env[name] || '';
  if (value) {
    lines.push(`${name}=${value}`);
    console.log(`[write-env] ✓ ${name} (${value.length} chars)`);
  } else {
    console.log(`[write-env] ✗ ${name} NOT SET`);
  }
}

fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
console.log(`[write-env] .env written with ${lines.length} variables`);
