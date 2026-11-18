// Lance Metro (client de développement, port 8081) contre le Supabase LOCAL, pour essayer l'app sur le Redmi avec les comptes de
// test (scripts/seed-lot3b-local.mjs). Jamais la production.
// Même principe que scripts/web-local.mjs : `.env.local` temporaire (il l'emporte sur `.env`, qui vise Paris), supprimé à la sortie.
// Le téléphone joint la base locale par une redirection adb du port 54321, et Metro par celle du 8081 (retirées à la sortie).
//
// 18 nov. 2026 : le premier essai a échoué parce qu'un autre Metro (visant Paris) occupait déjà le 8081 : Expo a basculé sur le
// 8082, le Redmi est resté sur le 8081 et la connexion de test est partie vers Paris. Désormais :
//   · REFUS de démarrer si le 8081 est occupé (rien n'est écrit) ;
//   · contrôle, une fois Metro prêt, que `.env.local` et les deux redirections sont toujours là ;
//   · le bundle servi est lu : il doit contenir l'URL locale et AUCUNE référence à Paris, sinon arrêt.
// Après un arrêt brutal (fenêtre fermée) : vérifier que `.env.local` n'existe plus et retirer les redirections
// (`adb reverse --remove tcp:54321`, `adb reverse --remove tcp:8081`) ; relancer ensuite le Metro habituel avec --clear.
// Usage : node scripts/redmi-local.mjs   (Ctrl+C pour arrêter proprement)
import { execSync, spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { exigerHoteLocal, REFERENCES_INTERDITES } from './garde-hote.mjs';

const APPAREIL = process.env.ADB_DEVICE ?? 'a3a0cfea';
const PORT_METRO = 8081;

const portLibre = (port) =>
  new Promise((ok) => {
    const s = createServer();
    s.once('error', () => ok(false));
    s.once('listening', () => s.close(() => ok(true)));
    s.listen(port, '0.0.0.0');
  });

if (!(await portLibre(PORT_METRO))) {
  console.error(`REFUS : le port ${PORT_METRO} est déjà occupé (un autre Metro, souvent celui qui vise Paris).`);
  console.error('Arrêtez-le d’abord : le Redmi se connecte au 8081, il resterait sur l’autre Metro. Rien n’a été écrit.');
  process.exit(2);
}
if (existsSync('.env.local')) {
  console.error('REFUS : un .env.local existe déjà (reste d’un arrêt brutal ?). Je ne l’écrase pas : vérifiez-le puis supprimez-le.');
  process.exit(2);
}

const statut = JSON.parse(execSync('npx supabase@latest status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
exigerHoteLocal(statut.API_URL);
if (!statut.ANON_KEY) {
  console.error('REFUS : `supabase status` ne donne pas de clé ANON_KEY (base locale arrêtée ?).');
  process.exit(2);
}
const portBase = new URL(statut.API_URL).port || '54321';
writeFileSync('.env.local', `EXPO_PUBLIC_SUPABASE_URL=${statut.API_URL}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${statut.ANON_KEY}\n`);

const adb = (...args) => spawnSync('adb', ['-s', APPAREIL, ...args], { encoding: 'utf8' });
for (const p of [portBase, String(PORT_METRO)]) {
  const r = adb('reverse', `tcp:${p}`, `tcp:${p}`);
  if (r.status !== 0) console.error(`ATTENTION : redirection adb du port ${p} impossible : ${r.stderr || r.error}`);
}

const nettoyer = () => {
  try {
    if (existsSync('.env.local') && readFileSync('.env.local', 'utf8').includes(statut.API_URL)) rmSync('.env.local');
  } catch {
    /* rien */
  }
  adb('reverse', '--remove', `tcp:${portBase}`);
  adb('reverse', '--remove', `tcp:${PORT_METRO}`);
};
process.on('exit', nettoyer);
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(s, () => process.exit(0));

const enfant = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--dev-client', '--port', String(PORT_METRO), '--clear'], {
  stdio: 'inherit',
});
enfant.on('exit', (c) => process.exit(c ?? 0));

// Contrôles une fois Metro prêt (le bundle Android est construit à la demande : jusqu'à quelques minutes).
async function controler() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT_METRO}/status`);
      if ((await r.text()).includes('running')) break;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  const bundle = await (await fetch(`http://localhost:${PORT_METRO}/index.bundle?platform=android&dev=true&minify=false`)).text();
  const paris = REFERENCES_INTERDITES.some((ref) => bundle.includes(ref));
  const local = bundle.includes(statut.API_URL);
  const redirections = adb('reverse', '--list').stdout ?? '';
  const ok =
    !paris &&
    local &&
    existsSync('.env.local') &&
    redirections.includes(`tcp:${portBase}`) &&
    redirections.includes(`tcp:${PORT_METRO}`);
  console.log(
    `\n[redmi-local] bundle : ${local ? 'URL locale présente' : 'URL LOCALE ABSENTE'}, ${paris ? 'RÉFÉRENCE À PARIS TROUVÉE' : 'aucune référence à Paris'} ; ` +
      `.env.local ${existsSync('.env.local') ? 'présent' : 'ABSENT'} ; redirections : ${redirections.trim().replace(/\s+/g, ' ') || 'AUCUNE'}`,
  );
  if (!ok) {
    console.error('[redmi-local] ARRÊT : contrôle échoué, Metro est arrêté.');
    enfant.kill();
    return;
  }
  console.log('[redmi-local] PRÊT : rechargez l’app sur le Redmi (menu de développement → Reload).');
}
controler().catch((e) => {
  console.error(`[redmi-local] ARRÊT : ${e.message}`);
  enfant.kill();
});
