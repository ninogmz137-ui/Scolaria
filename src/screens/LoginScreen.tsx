import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ENV } from '../services/getEnv';
import ScolariaSymbol from '../components/ScolariaSymbol';
import LogoMarque from '../components/LogoMarque';
import { Text } from '../components/ui';
import { useSessionExpiree } from '../services/sessionExpiree';

const BG = '#F2F1EE';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { enterDemoMode } = useAuth();
  const sessionExpiree = useSessionExpiree();

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={styles.symbolHalo}>
            <ScolariaSymbol size={28} color={INDIGO} />
          </View>
          <LogoMarque fontSize={32} primaryColor={NAVY} sparkleColor={INDIGO} />
          <Text style={styles.tagline}>Le carnet de scolarité numérique</Text>
        </View>

        {/* Session terminée sans action de la personne (jeton refusé…) : on le dit. */}
        {sessionExpiree ? (
          <Text style={styles.expiree} accessibilityRole="alert">
            Votre session a expiré. Reconnectez-vous pour retrouver votre carnet.
          </Text>
        ) : null}

        {/* Buttons */}
        <View style={styles.actions}>
          {/* APK de démonstration (APP_VARIANT=demo) : ni connexion ni inscription, seul « Essayer en mode démo ». */}
          {!ENV.VARIANTE_DEMO ? (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Connexion')}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              </TouchableOpacity>

              <View style={{ height: 10 }} />

              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Inscription')}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>Créer un compte</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              enterDemoMode();
              navigation.navigate('MainPager');
            }}
            activeOpacity={ENV.VARIANTE_DEMO ? 0.9 : 0.8}
            style={ENV.VARIANTE_DEMO ? styles.primaryBtn : styles.demoWrap}
            accessibilityRole="button"
          >
            <Text style={ENV.VARIANTE_DEMO ? styles.primaryBtnText : styles.demoText}>Essayer en mode démo</Text>
          </TouchableOpacity>
          {ENV.VARIANTE_DEMO ? (
            <Text style={{ fontFamily: 'Figtree_300Light', fontSize: 11, color: 'rgba(15,23,42,0.35)', textAlign: 'center', marginTop: 14 }}>
              Une famille fictive, aucune donnée réelle.
            </Text>
          ) : null}
        </View>
      </View>

      {/* Mentions légales : RETIRÉES tant que la page « politique de confidentialité / mentions légales »
          (D5) n'existe pas — le texte renvoyait à des documents inexistants. À remettre avec un lien réel. */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: '100%',
    alignItems: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 48,
  },
  symbolHalo: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(67,56,202,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tagline: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: 'rgba(15,23,42,0.50)',
    marginTop: 6,
  },
  expiree: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: NAVY,
    textAlign: 'center',
    marginTop: -24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 240,
    height: 52,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    width: '100%',
    maxWidth: 240,
    height: 52,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
    color: NAVY,
  },
  demoWrap: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  demoText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: INDIGO,
  },
  legal: {
    position: 'absolute',
    left: 24,
    right: 24,
    fontFamily: 'Figtree_400Regular',
    fontSize: 10,
    color: 'rgba(15,23,42,0.30)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
