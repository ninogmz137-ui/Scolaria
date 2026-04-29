/**
 * EAS Build config plugin — adds Google Maven as a fallback repository
 * in settings.gradle pluginManagement block. Fixes Maven Central 429 rate limiting.
 */
const { withSettingsGradle } = require('expo/config-plugins');

function withGoogleMavenFix(config) {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Add google() to pluginManagement repositories if not already present
    if (contents.includes('pluginManagement')) {
      // Insert google() right after the first "repositories {" inside pluginManagement
      config.modResults.contents = contents.replace(
        /(pluginManagement\s*\{[\s\S]*?repositories\s*\{)/,
        '$1\n        google()\n        mavenCentral()'
      );
    }

    return config;
  });
}

module.exports = withGoogleMavenFix;
