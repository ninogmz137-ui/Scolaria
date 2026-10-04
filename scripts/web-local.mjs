// Lance l'aperçu WEB de l'app contre le Supabase LOCAL (jamais la production) : pour vérifier un écran avec de vraies données de
// test (comptes et enfants de test créés par scripts/seed-web-local.mjs). Port 8082 (le Metro habituel garde le 8081).
// Les clés viennent de `supabase status` (clés de démonstration du Supabase local, publiques).
// POURQUOI un .env.local temporaire : app.config.js injecte le .env du projet (URL de PARIS) dans `extra`, et getEnv lit `extra`
// avant process.env : une simple variable d'environnement ne suffit pas (constaté le 4 oct 2026 : l'aperçu « local » visait
// Paris). `.env.local` l'emporte sur `.env` ; il est supprimé à la sortie (ignoré par git : .gitignore ligne 35).
// Contrôle : le bundle servi ne doit contenir AUCUNE URL de Paris (vérifié ci-dessous, sinon arrêt).
// Usage : node scripts/web-local.mjs   (ou preview_start « expo-web-local »)
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
import { exigerHoteLocal } from './garde-hote.mjs';
exigerHoteLocal(statut.API_URL);
if (existsSync('.env.local')) throw new Error('Refus : un .env.local existe déjà (je ne l’écrase pas).');
writeFileSync('.env.local', `EXPO_PUBLIC_SUPABASE_URL=${statut.API_URL}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${statut.ANON_KEY}\n`);
const nettoyer = () => {
  try {
    if (existsSync('.env.local') && readFileSync('.env.local', 'utf8').includes(statut.API_URL)) rmSync('.env.local');
  } catch {
    /* rien */
  }
};
process.on('exit', nettoyer);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));

const enfant = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--web', '--port', '8082', '--clear'], { stdio: 'inherit' });
enfant.on('exit', (c) => process.exit(c ?? 0));
