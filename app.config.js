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
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const GOOGLE_VISION_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY ?? '';

if (IS_EAS) {
  console.log('[app.config.js] EAS Build detected');
  console.log('[app.config.js] SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('[app.config.js] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.log('[app.config.js] ANTHROPIC_API_KEY:', ANTHROPIC_API_KEY ? 'SET' : 'MISSING');
}

module.exports = {
  expo: {
    name: 'Scolaria',
    slug: 'Scolaria',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    scheme: 'scolaria',
    splash: {
      /* Image required: expo-splash-screen references @drawable/splashscreen_logo in generated styles,
         so omitting the image breaks `:app:processReleaseResources` (aapt linking).
         LoginScreen takes over as soon as JS boots. */
      image: './assets/splash-icon.png',
      backgroundColor: '#FAFAF8',
      resizeMode: 'contain',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.scolaria.app',
      buildNumber: '1',
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
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#FFFFFF',
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
    ],
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      EXPO_PUBLIC_ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
      EXPO_PUBLIC_GOOGLE_VISION_KEY: GOOGLE_VISION_KEY,
      eas: {
        projectId: 'bf7dc734-6f3f-4481-80d7-84fd2c818404',
      },
    },
    owner: 'nino137',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/bf7dc734-6f3f-4481-80d7-84fd2c818404',
    },
  },
};
