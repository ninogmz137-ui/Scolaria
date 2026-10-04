/**
 * Variante « démo » de l'application (APK de démonstration, profil EAS « demo » : APP_VARIANT=demo dans eas.json).
 * app.config.js recopie APP_VARIANT dans `extra` ; cette règle (pure, testable hors application) le lit.
 * En variante démo : ni connexion, ni inscription, ni mot de passe oublié, ni espace enseignant / élève :
 * seul « Essayer en mode démo » mène à l'application (écran d'ouverture et routes absentes de la navigation).
 */
export function estVarianteDemo(extra: Record<string, unknown> | undefined | null): boolean {
  return extra?.APP_VARIANT === 'demo';
}
