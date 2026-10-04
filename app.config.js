/**
 * Dynamic Expo config — reads environment variables at build time
 * and injects them into `extra` so they're accessible at runtime
 * via Constants.expoConfig.extra.
 *
 * This solves the EAS Build problem where .env may not be available
 * but eas.json env block IS injected as OS environment variables.
 */

const IS_EAS = process.env.EAS_BUILD === 'true';

// Read from eas.json env (OS env during EAS Build) or local .env (loaded by Metro)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
// Aucune clé d'API tierce ici : Anthropic et Google Vision passent par les Edge Functions
// Supabase (secrets serveur). Tout ce qui est dans `extra` est lisible dans l'APK.

if (IS_EAS) {
  console.log('[app.config.js] EAS Build detected');
  console.log('[app.config.js] SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('[app.config.js] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
}

const config = {
  expo: {
    name: 'Scolaria',
    slug: 'Scolaria',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'scolaria',
    splash: {
      /* Image required: expo-splash-screen generates @drawable/splashscreen_logo,
         omitting it breaks `:app:processReleaseResources` (aapt linking).
         icon.png (1024×1024, Direction 01 logo on white) shares the same
         backgroundColor as the splash → seamless on Android. */
      image: './assets/icon.png',
      backgroundColor: '#FFFFFF',
      resizeMode: 'contain',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.scolaria.app',
      buildNumber: '2',
      infoPlist: {
        UIBackgroundModes: ['fetch', 'remote-notification'],
        NSCameraUsageDescription:
          'Scolaria utilise la caméra pour scanner les bulletins scolaires.',
        NSPhotoLibraryUsageDescription:
          "Scolaria accède à vos photos pour importer des bulletins scolaires.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.scolaria.app',
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundColor: '#FFFFFF',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      /* Explicit Android splash — same image + bg as the top-level splash
         block, belt-and-suspenders against any Expo platform override. */
      splash: {
        image: './assets/icon.png',
        backgroundColor: '#FFFFFF',
        resizeMode: 'contain',
      },
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#22D3EE',
          sounds: [],
        },
      ],
      'expo-localization',
      'expo-sharing',
      './plugins/withGoogleMavenFix',
      './plugins/withForceDarkDisabled',
    ],
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      eas: {
        projectId: 'bf7dc734-6f3f-4481-80d7-84fd2c818404',
      },
    },
    owner: 'nino137',
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/bf7dc734-6f3f-4481-80d7-84fd2c818404',
    },
  },
};

// ─── Variante « démo » (profil EAS preview : APP_VARIANT=demo) ──────────────────────────────────────────────
// APK de démonstration autonome, installé À CÔTÉ de l'application de développement, sans aucun accès à un serveur :
//  - identifiant Android distinct (suffixe .demo) : l'identifiant de base ci-dessus n'est PAS modifié ;
//  - URL et clé factices : l'app se croit non configurée (« your- » dans l'URL, cf. AuthContext et database.ts) → mode démo,
//    aucune requête réseau vers un serveur ; le domaine .invalid ne se résout jamais ;
//  - ni schéma de lien (scolaria://), ni mises à jour à distance ;
//  - libellé de l'icône : variable APP_LIBELLE_DEMO (jamais le nom écrit en dur ici).
// Sans APP_VARIANT : configuration strictement identique à celle d'avant (production et développement inchangés).
if (process.env.APP_VARIANT === 'demo') {
  const { expo } = config;
  expo.android.package += '.demo';
  expo.name = process.env.APP_LIBELLE_DEMO || 'Démo';
  delete expo.scheme;
  expo.updates = { enabled: false };
  expo.extra = {
    ...expo.extra,
    EXPO_PUBLIC_SUPABASE_URL: 'https://your-demo.invalid',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'demo-sans-serveur', APP_VARIANT: 'demo',
  };
}

module.exports = config;
