// Lance Metro (client de développement, port 8081) contre le Supabase LOCAL, pour essayer l'app sur le Redmi avec les comptes de
// test (scripts/seed-lot3b-local.mjs). Jamais la production.
// Même principe que scripts/web-local.mjs : `.env.local` temporaire (il l'emporte sur `.env`, qui vise Paris), supprimé à la sortie.
// Le téléphone joint la base locale par une redirection adb du port 54321 (retirée à la sortie).
// Après un arrêt brutal : vérifier que `.env.local` n'existe plus, retirer la redirection (`adb reverse --remove tcp:54321`)
// et relancer Metro avec --clear (leçon du 4 oct. 2026).
// Usage : node scripts/redmi-local.mjs
import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { exigerHoteLocal } from './garde-hote.mjs';

const APPAREIL = process.env.ADB_DEVICE ?? 'a3a0cfea';
const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
const port = new URL(statut.API_URL).port || '54321';
if (existsSync('.env.local')) throw new Error('Refus : un .env.local existe déjà (je ne l’écrase pas).');
writeFileSync('.env.local', `EXPO_PUBLIC_SUPABASE_URL=${statut.API_URL}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${statut.ANON_KEY}\n`);
const adb = (...args) => spawnSync('adb', ['-s', APPAREIL, ...args], { encoding: 'utf8' });
const r = adb('reverse', `tcp:${port}`, `tcp:${port}`);
if (r.status !== 0) console.error(`Redirection adb impossible : ${r.stderr}`);

const nettoyer = () => {
  try {
    if (existsSync('.env.local') && readFileSync('.env.local', 'utf8').includes(statut.API_URL)) rmSync('.env.local');
  } catch {
    /* rien */
  }
  adb('reverse', '--remove', `tcp:${port}`);
};
process.on('exit', nettoyer);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));

const enfant = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--dev-client', '--port', '8081', '--clear'], {
  stdio: 'inherit',
});
enfant.on('exit', (c) => process.exit(c ?? 0));
