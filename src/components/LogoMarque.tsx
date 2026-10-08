/**
 * LogoMarque — le logo de la marque, ou, dans la VARIANTE DÉMO (APK de démonstration), le nom affiché de la variante en texte.
 *
 * Pourquoi : l'APK de démonstration ne doit afficher ni « Scolaria » ni aucun autre nom de produit (le nom définitif n'est pas arrêté).
 * Sans variante (cas normal) : rend exactement <ScolariaLogo> avec les mêmes propriétés — comportement strictement inchangé.
 * Variante démo : NOM_APP (« Carnet Démo », valeur propre à la variante, cf. constants/marque.ts) en Rufina Bold, mêmes taille et couleur ;
 * le symbole de la marque (couronne) reste affiché par l'écran appelant (écran d'ouverture : halo ; À propos : icône).
 */
import { ENV } from '../services/getEnv';
import { NOM_APP } from '../constants/marque';
import { Text } from './ui';
import ScolariaLogo, { type ScolariaLogoProps } from './ScolariaLogo';

export default function LogoMarque(props: ScolariaLogoProps) {
  if (!ENV.VARIANTE_DEMO) return <ScolariaLogo {...props} />;
  const { fontSize = 48, primaryColor = '#0F172A' } = props;
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: 'Rufina_700Bold', fontSize, lineHeight: Math.round(fontSize * 1.25), color: primaryColor, letterSpacing: -0.5, textAlign: 'center' }}
    >
      {NOM_APP}
    </Text>
  );
}
