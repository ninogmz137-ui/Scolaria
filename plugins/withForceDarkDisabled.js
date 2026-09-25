/**
 * Config plugin — désactive le "force dark" système (MIUI, Android 10+) sur le thème de l'app.
 * Scolaria n'a pas de mode sombre : sans cet item, Android/MIUI inverse les couleurs de force.
 * Pose <item name="android:forceDarkAllowed">false</item> dans AppTheme (res/values/styles.xml).
 */
const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

function withForceDarkDisabled(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:forceDarkAllowed',
      value: 'false',
    });
    return config;
  });
}

module.exports = withForceDarkDisabled;
