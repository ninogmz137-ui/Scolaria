/**
 * OnboardingSignupScreen — Création de compte (étape 1/4).
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
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
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

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: React.ReactNode;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
}

function InputField({
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = 'default',
  secureTextEntry = false,
  rightElement,
}: InputFieldProps) {
  return (
    <View style={styles.inputOuter}>
      <View style={styles.inputInner}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={C.text35}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
        {rightElement}
      </View>
    </View>
  );
}

export default function OnboardingSignupScreen() {
  const navigation = useNavigation<any>();
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <StepDots current={1} total={4} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Créer ton compte</Text>
        <Text style={styles.subtitle}>Accès gratuit · Aucune pub · Tes données restent en France</Text>

        <View style={{ marginTop: 28 }}>
          <InputField
            placeholder="Prénom"
            value={prenom}
            onChangeText={setPrenom}
            icon={<User size={18} color={C.text35} strokeWidth={1.8} />}
          />
          <InputField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={18} color={C.text35} strokeWidth={1.8} />}
            keyboardType="email-address"
          />
          <InputField
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={18} color={C.text35} strokeWidth={1.8} />}
            secureTextEntry={!showPw}
            rightElement={
              <TouchableOpacity onPress={() => setShowPw((p) => !p)} style={{ padding: 4 }}>
                {showPw
                  ? <EyeOff size={18} color={C.text35} strokeWidth={1.8} />
                  : <Eye size={18} color={C.text35} strokeWidth={1.8} />}
              </TouchableOpacity>
            }
          />
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OnboardingSchool')}
        >
          <Text style={styles.continueBtnText}>Continuer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text55,
    marginHorizontal: 20,
    marginTop: 6,
    lineHeight: 20,
  },

  // Input — Android 2-Views
  inputOuter: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: C.white,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 0 },
    }),
  },
  inputInner: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: C.text,
    height: 52,
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
