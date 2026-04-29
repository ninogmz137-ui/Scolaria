import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import ScolariaLogo from '../components/ScolariaLogo';

const BG = '#F2F1EE';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { enterDemoMode } = useAuth();

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={styles.symbolHalo}>
            <ScolariaSymbol size={28} color={INDIGO} />
          </View>
          <ScolariaLogo fontSize={32} primaryColor={NAVY} sparkleColor={INDIGO} />
          <Text style={styles.tagline}>Le carnet de scolarité numérique</Text>
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
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

          <TouchableOpacity
            onPress={() => {
              enterDemoMode();
              navigation.navigate('MainPager');
            }}
            activeOpacity={0.8}
            style={styles.demoWrap}
            accessibilityRole="button"
          >
            <Text style={styles.demoText}>Essayer en mode démo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal mentions */}
      <Text style={[styles.legal, { bottom: insets.bottom + 16 }]}>
        En continuant, vous acceptez les conditions{'\n'}
        et la politique de confidentialité.
      </Text>
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
