/**
 * OnboardingSplashScreen — Écran de démarrage / accueil de l'app.
 * Fond C.bg, logo centré, 2 boutons + lien démo.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { C } from '../../constants/design';
import { FontFamily } from '../../hooks/useSolariaFonts';
import ScolariaSymbol from '../../components/ScolariaSymbol';
import ScolariaLogo from '../../components/ScolariaLogo';

export default function OnboardingSplashScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.root}>
      {/* Centre */}
      <View style={styles.center}>
        <ScolariaSymbol size={80} color={C.indigo} />
        <View style={{ marginTop: 20 }}>
          <ScolariaLogo fontSize={42} primaryColor={C.text} sparkleColor={C.indigo} />
        </View>
        <Text style={styles.tagline}>Le carnet de scolarité numérique</Text>

        <View style={{ height: 48 }} />

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OnboardingSignup')}
        >
          <Text style={styles.primaryBtnText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { marginTop: 14 }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('OnboardingSignup')}
        >
          <Text style={styles.secondaryBtnText}>Créer un compte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ padding: 16, marginTop: 4 }}
          activeOpacity={0.7}
        >
          <Text style={styles.demoLink}>Essayer en mode démo</Text>
        </TouchableOpacity>
      </View>

      {/* Mentions légales */}
      <View style={[styles.footer, { bottom: insets.bottom + 12 }]}>
        <Text style={styles.footerText}>Conditions · Politique de confidentialité</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    color: C.text55,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 280,
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  primaryBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: C.white,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 280,
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  secondaryBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: C.text,
  },
  demoLink: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text55,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text35,
    textAlign: 'center',
  },
});
