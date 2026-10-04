// Prouve la variante « démo » de l'APK de démonstration (profil EAS « demo ») — hors ligne, sans build :
//  A. SANS APP_VARIANT, la configuration est strictement identique à celle d'AVANT la variante (commit d61d02b) ;
//  B. AVEC APP_VARIANT=demo, seules cinq clés changent (identifiant distinct, libellé, sans schéma, sans mises à jour, URL factice) ;
//  C. eas.json : le profil preview est dans son état d'origine ; « demo » étend preview, environnement vide ; UN SEUL endroit active la variante ;
//  D. aucun chemin vers la connexion, l'inscription, le mot de passe oublié ou un rôle enseignant / élève dans la variante démo.
//   npm run test:variante-demo
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { estVarianteDemo } from '../src/utils/varianteDemo.ts';

const require = createRequire(import.meta.url);
const AVANT = 'd61d02b'; // dernier commit AVANT la variante démo
let echecs = 0;
const ok = (c, m) => {
  console.log(`${c ? 'OK    ' : 'ECHEC '} ${m}`);
  if (!c) echecs++;
};
const lire = (f) => fs.readFileSync(f, 'utf8');
const charger = (chemin, env) => {
  const avant = {};
  for (const k of ['APP_VARIANT', 'APP_LIBELLE_DEMO', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']) {
    avant[k] = process.env[k];
    delete process.env[k];
  }
  Object.assign(process.env, env);
  delete require.cache[require.resolve(chemin)];
  try {
    return JSON.parse(JSON.stringify(require(chemin)));
  } finally {
    for (const [k, v] of Object.entries(avant)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};
// URL de Paris injectée EN ENTRÉE (comme le ferait un .env local ou l'environnement EAS « preview ») : la variante démo doit l'ignorer.
const PARIS_ENV = { EXPO_PUBLIC_SUPABASE_URL: 'https://nmizwmymhqleasnxcyvu.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'cle-publique-d-essai' };

// ── A. Sans variante : identique à l'état d'avant
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'variante-demo-'));
const ancienChemin = path.join(tmp, 'ancien.config.cjs');
fs.writeFileSync(ancienChemin, execSync(`git show ${AVANT}:app.config.js`, { encoding: 'utf8' }));
const ancien = charger(ancienChemin, {});
const actuel = charger(path.resolve('app.config.js'), {});
ok(JSON.stringify(ancien) === JSON.stringify(actuel), `A. sans APP_VARIANT : configuration identique à celle du commit ${AVANT}`);
ok(actuel.expo.android.package === 'com.scolaria.app' && actuel.expo.scheme === 'scolaria' && !!actuel.expo.updates.url, 'A. identifiant de base, schéma et mises à jour inchangés');
ok(!('APP_VARIANT' in actuel.expo.extra), 'A. aucune trace de la variante dans `extra`');

// ── B. Avec la variante
const easJson = JSON.parse(lire('eas.json'));
const libelle = easJson.build.demo?.env?.APP_LIBELLE_DEMO;
const demo = charger(path.resolve('app.config.js'), { APP_VARIANT: 'demo', APP_LIBELLE_DEMO: libelle, ...PARIS_ENV });
const changees = [...new Set([...Object.keys(demo.expo), ...Object.keys(ancien.expo)])].filter((k) => JSON.stringify(demo.expo[k]) !== JSON.stringify(ancien.expo[k])).sort();
ok(JSON.stringify(changees) === JSON.stringify(['android', 'extra', 'ios', 'name', 'scheme', 'updates']), `B. clés modifiées : ${changees.join(', ')}`);
ok(demo.expo.android.package === ancien.expo.android.package + '.demo', `B. identifiant distinct : ${demo.expo.android.package} (base ${ancien.expo.android.package} intacte)`);
ok(demo.expo.name === 'Carnet Démo' && demo.expo.name === libelle, `B. libellé d'icône « ${demo.expo.name} » (variable APP_LIBELLE_DEMO)`);
ok(demo.expo.scheme === undefined, 'B. aucun schéma de lien (scolaria://)');
ok(demo.expo.updates.enabled === false && !demo.expo.updates.url, 'B. mises à jour à distance désactivées');
const sansVarianteParis = charger(path.resolve('app.config.js'), PARIS_ENV);
ok(JSON.stringify(sansVarianteParis).includes('nmizwmymhqleasnxcyvu'), 'B. (témoin) SANS variante, une URL de Paris en entrée se retrouve dans la configuration : le contrôle a des dents');
ok(/your-/.test(demo.expo.extra.EXPO_PUBLIC_SUPABASE_URL) && !JSON.stringify(demo).includes('nmizwmymhqleasnxcyvu') && !JSON.stringify(demo).includes('cle-publique-d-essai'), 'B. AVEC variante, même avec une URL et une clé de Paris en entrée : URL factice, aucune référence de Paris dans la configuration résolue');
ok(demo.expo.extra.APP_VARIANT === 'demo', 'B. APP_VARIANT recopié dans `extra` (lu par l\'app)');
// Chaînes VISIBLES de la configuration (libellé de l'icône, textes des autorisations iOS, libellé recopié pour l'app) : aucun nom de produit.
const visibles = [demo.expo.name, demo.expo.extra.APP_LIBELLE, demo.expo.ios.infoPlist.NSCameraUsageDescription, demo.expo.ios.infoPlist.NSPhotoLibraryUsageDescription];
ok(visibles.every((v) => typeof v === 'string' && v && !/scolaria|theka/i.test(v)), 'B. chaînes visibles de la configuration (libellé, autorisations iOS) : aucun « Scolaria » ni « Theka »');
ok(ancien.expo.ios.infoPlist.NSCameraUsageDescription.includes('Scolaria'), 'B. (témoin) sans variante, ces textes nomment bien « Scolaria » : inchangés');

// ── C. eas.json
const easAvant = JSON.parse(execSync(`git show ${AVANT}:eas.json`, { encoding: 'utf8' }));
ok(JSON.stringify(easJson.build.preview) === JSON.stringify(easAvant.build.preview), 'C. profil preview dans son état d\'origine (sans environment ni env)');
ok(JSON.stringify(easJson.build.development) === JSON.stringify(easAvant.build.development) && JSON.stringify(easJson.build.production) === JSON.stringify(easAvant.build.production), 'C. development et production inchangés');
const d = easJson.build.demo;
ok(d?.extends === 'preview' && d.environment === 'production', 'C. « demo » étend preview, environnement EAS « production » (aucune variable)');
ok(JSON.stringify(Object.keys(d.env).sort()) === JSON.stringify(['APP_LIBELLE_DEMO', 'APP_VARIANT']) && d.env.APP_VARIANT === 'demo', 'C. « demo » ne définit que APP_VARIANT et APP_LIBELLE_DEMO (aucune variable Supabase)');
const profils = Object.entries(easJson.build).filter(([, p]) => JSON.stringify(p).includes('APP_VARIANT')).map(([n]) => n);
ok(JSON.stringify(profils) === '["demo"]', `C. un seul profil active la variante : ${profils.join(', ')}`);
// aucun autre fichier de configuration ne pose APP_VARIANT (hors lecture dans app.config.js)
const fichiers = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter((f) => /^(package\.json|\.env.*|app\.json|eas\.json|babel\.config\.js|metro\.config\.js)$/.test(f));
const pose = fichiers.filter((f) => f !== 'eas.json' && /APP_VARIANT\s*[=:]/.test(lire(f)));
ok(pose.length === 0, 'C. APP_VARIANT n\'est posé nulle part ailleurs (package.json, .env, config)');

// ── D. Aucun chemin vers connexion / inscription / rôle enseignant ou élève
ok(estVarianteDemo({ APP_VARIANT: 'demo' }) && !estVarianteDemo({}) && !estVarianteDemo(undefined) && !estVarianteDemo({ APP_VARIANT: 'autre' }), 'D. règle estVarianteDemo (vrai seulement pour « demo »)');
const app = lire('App.tsx');
for (const nom of ['Connexion', 'MotDePasseOublie', 'NouveauMotDePasse', 'Inscription', 'EnseignantDashboard', 'EleveSpace']) {
  const ligne = app.split(/\r?\n/).find((l) => l.includes(`<RootStack.Screen name="${nom}"`));
  ok(!!ligne && ligne.includes('!ENV.VARIANTE_DEMO &&'), `D. route « ${nom} » absente de la navigation en variante démo`);
}
const login = lire('src/screens/LoginScreen.tsx').replace(/\r\n/g, '\n');
const debut = login.indexOf('{!ENV.VARIANTE_DEMO ? (');
const fin = login.indexOf(') : null}', debut);
const dedans = login.slice(debut, fin);
const dehors = login.slice(0, debut) + login.slice(fin);
ok(debut > 0 && dedans.includes("navigate('Connexion')") && dedans.includes("navigate('Inscription')"), 'D. écran d\'ouverture : « Se connecter » et « Créer un compte » sont dans le bloc masqué en variante démo');
ok(!/navigate\('(Connexion|Inscription)'\)/.test(dehors), 'D. écran d\'ouverture : aucune autre navigation vers la connexion ou l\'inscription');
ok(dehors.includes('Essayer en mode démo'), 'D. écran d\'ouverture : « Essayer en mode démo » reste proposé');
// Aucun autre fichier ne mène à ces écrans (un nouveau chemin ferait échouer ce test)
const sources = execSync('git ls-files src App.tsx', { encoding: 'utf8' }).split(/\r?\n/).filter((f) => /\.(tsx?|mts)$/.test(f));
const cibles = /(navigate|replace|reset|push)\([^)]*['"](Connexion|Inscription|EnseignantDashboard|EleveSpace|MotDePasseOublie|NouveauMotDePasse)['"]|screen:\s*['"](Connexion|Inscription|EnseignantDashboard|EleveSpace)['"]|ouvrirQuandConnecte\('NouveauMotDePasse'\)/;
const autorises = new Set(['App.tsx', 'src/screens/LoginScreen.tsx', 'src/screens/ConnexionScreen.tsx', 'src/screens/InscriptionScreen.tsx', 'src/components/LiensAuthRouteur.tsx']);
const intrus = sources.filter((f) => !autorises.has(f) && cibles.test(lire(f)));
ok(intrus.length === 0, `D. aucun autre fichier ne navigue vers ces écrans${intrus.length ? ' : ' + intrus.join(', ') : ''}`);
// Les fichiers autorisés : leurs routes sont retirées de la navigation (ConnexionScreen / InscriptionScreen ne sont atteints que par elles), les liens
// d'e-mail n'arrivent pas (aucun schéma de lien en variante démo).
const redirection = app.includes("role === 'enseignant'") && app.includes("? 'EnseignantDashboard'");
ok(redirection, 'D. (information) la redirection par rôle existe toujours dans App.tsx, mais aucun chemin n\'attribue ce rôle en variante démo (inscription et connexion absentes)');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nVARIANTE DÉMO : tout est conforme.');
process.exit(echecs ? 1 : 0);
