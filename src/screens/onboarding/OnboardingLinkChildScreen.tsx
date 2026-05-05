/**
 * OnboardingLinkChildScreen — Lier un enfant au compte (étape 3/4).
 * Emoji avatar picker en ScrollView horizontal (pas de flexWrap+percentage — Android lesson).
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
import { ChevronLeft } from 'lucide-react-native';
import { C } from '../../constants/design';
import { FontFamily } from '../../hooks/useSolariaFonts';

const NIVEAUX = [
  'Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ᵉ', '5ᵉ', '4ᵉ', '3ᵉ', '2de', '1ère', 'Terminale',
];

const EMOJIS = ['🐆', '🦁', '🐺', '🦊', '🐻', '🐸', '🐬', '🦋'];

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

export default function OnboardingLinkChildScreen() {
  const navigation = useNavigation<any>();
  const [prenom, setPrenom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [emoji, setEmoji] = useState('🐆');

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <StepDots current={3} total={4} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Qui est votre enfant ?</Text>

        {/* Prénom */}
        <View style={[styles.inputOuter, { marginTop: 24 }]}>
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor={C.text35}
              value={prenom}
              onChangeText={setPrenom}
            />
          </View>
        </View>

        {/* Niveau */}
        <Text style={styles.sectionLabel}>NIVEAU SCOLAIRE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {NIVEAUX.map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.pill,
                niveau === n ? styles.pillActive : styles.pillInactive,
                { marginRight: 8 },
              ]}
              onPress={() => setNiveau(n)}
            >
              <Text
                style={[
                  styles.pillText,
                  niveau === n ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Avatar emoji */}
        <Text style={[styles.sectionLabel, { paddingTop: 20 }]}>EMOJI AVATAR</Text>
        {/* ScrollView horizontal — pas de flexWrap+% (Android lesson) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiContainer}
        >
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[
                styles.emojiBtn,
                emoji === e ? styles.emojiBtnActive : styles.emojiBtnInactive,
                { marginRight: 10 },
              ]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.continueBtnText}>Terminer et accéder à Scolaria</Text>
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

  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: C.text,
    marginTop: 24,
    marginHorizontal: 20,
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
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: C.text,
    height: 52,
  },

  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.text,
    opacity: 0.28,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
  },

  pillsContainer: { paddingHorizontal: 14 },
  pill: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: C.text },
  pillInactive: { backgroundColor: 'rgba(15,23,42,0.08)' },
  pillText: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
  pillTextActive: { color: C.white },
  pillTextInactive: { color: C.text35 },

  emojiContainer: { paddingHorizontal: 14, paddingVertical: 4 },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: { backgroundColor: 'rgba(67,56,202,0.12)' },
  emojiBtnInactive: { backgroundColor: 'rgba(15,23,42,0.06)' },
  emojiText: { fontSize: 28 },

  continueBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    paddingHorizontal: 32,
    marginTop: 32,
    marginBottom: 24,
  },
  continueBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: C.white,
  },
});
