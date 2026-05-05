/**
 * OnboardingSchoolCodeScreen — Code établissement (étape 2/4).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, School } from 'lucide-react-native';
import { C } from '../../constants/design';
import { FontFamily } from '../../hooks/useSolariaFonts';

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current - 1 ? styles.dotActive : styles.dotInactive,
            i < total - 1 ? { marginRight: 6 } : undefined,
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingSchoolCodeScreen() {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <StepDots current={2} total={4} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icône école */}
        <View style={styles.iconWrap}>
          <School size={28} color={C.indigo} strokeWidth={1.8} />
        </View>

        <Text style={styles.title}>L'école de votre enfant</Text>
        <Text style={styles.subtitle}>
          Entrez le code fourni par l'établissement pour connecter automatiquement
          le suivi de votre enfant.
        </Text>

        {/* Input code */}
        <View style={[styles.inputOuter, { marginTop: 28 }]}>
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder="Code établissement"
              placeholderTextColor={C.text35}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.ghostLink}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostLinkText}>Je n'ai pas de code →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OnboardingChild')}
        >
          <Text style={styles.continueBtnText}>Continuer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  android: { elevation: 0 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotActive: { backgroundColor: C.text },
  dotInactive: { backgroundColor: 'rgba(15,23,42,0.15)' },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(67,56,202,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 32,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: C.text,
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text55,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    lineHeight: 20,
  },

  // Input
  inputOuter: {
    marginHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.white,
    ...(cardShadow as any),
  },
  inputInner: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    height: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    color: C.text,
    height: 52,
    letterSpacing: 3,
  },

  ghostLink: { alignSelf: 'center', marginTop: 16 },
  ghostLinkText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: C.indigo,
  },

  continueBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 260,
    alignSelf: 'center',
    paddingHorizontal: 40,
    marginTop: 32,
  },
  continueBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: C.white,
  },
});
