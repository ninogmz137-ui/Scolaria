/**
 * LoginScreen — Dark cinematic login with premium gradient background.
 *
 * Background: deep navy #0B1628 → blue-violet #1E3A7A gradient.
 * Glass-style input fields, gradient CTA, child PIN access section.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Papicons } from '@getpapillon/papicons';
import LogoScolaria from '../components/LogoScolaria';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Constants ──────────────────────────────────────────

const INPUT_BG = 'rgba(255,255,255,0.12)';
const INPUT_BORDER = 'rgba(255,255,255,0.25)';
const PLACEHOLDER = 'rgba(255,255,255,0.5)';
const VIOLET = '#6366F1';
const CYAN = '#22D3EE';
const { height: SH } = Dimensions.get('window');

// ─── Component ──────────────────────────────────────────

interface Props {
  onNavigatePin: () => void;
}

export default function LoginScreen({ onNavigatePin }: Props) {
  const { signIn, signUp, enterDemoMode } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Veuillez remplir tous les champs.'); return; }
    if (mode === 'signup' && !familyName.trim()) { setError('Le nom de famille est requis.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    setLoading(true);
    try {
      if (mode === 'login') { await signIn(email.trim(), password); }
      else { await signUp(email.trim(), password, familyName.trim()); }
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.');
      else if (msg.includes('already registered')) setError('Cet email est déjà utilisé.');
      else setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      {/* Premium gradient background */}
      <LinearGradient colors={['#0B1628', '#1E3A7A']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
            {/* Logo + tagline */}
            <View style={s.logoSection}>
              <LogoScolaria size={56} variant="dark" />
              <Text style={s.tagline}>Le copilote éducatif des familles</Text>
            </View>

            {/* Form */}
            <View style={s.form}>
              <Text style={s.formTitle}>
                {mode === 'login' ? 'Connexion' : 'Créer un compte'}
              </Text>

              {/* Family name (signup) */}
              {mode === 'signup' && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Nom de famille</Text>
                  <View style={s.inputRow}>
                    <Papicons name="User" size={18} color="rgba(255,255,255,0.3)" />
                    <TextInput
                      style={s.input}
                      placeholder="Moreau"
                      placeholderTextColor={PLACEHOLDER}
                      value={familyName}
                      onChangeText={setFamilyName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Email</Text>
                <View style={s.inputRow}>
                  <Papicons name="Send" size={18} color="rgba(255,255,255,0.3)" />
                  <TextInput
                    style={s.input}
                    placeholder="parent@email.fr"
                    placeholderTextColor={PLACEHOLDER}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Mot de passe</Text>
                <View style={s.inputRow}>
                  <Papicons name="Lock" size={18} color="rgba(255,255,255,0.3)" />
                  <TextInput
                    style={s.input}
                    placeholder="••••••••"
                    placeholderTextColor={PLACEHOLDER}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Papicons name={showPassword ? 'EyeClosed' : 'Eye'} size={20} color="rgba(255,255,255,0.35)" />
                  </Pressable>
                </View>
              </View>

              {/* Forgot password */}
              {mode === 'login' && (
                <Pressable style={{ alignSelf: 'flex-end', marginTop: -4 }}>
                  <Text style={s.forgotText}>Mot de passe oublié ?</Text>
                </Pressable>
              )}

              {/* Error */}
              {error ? (
                <View style={s.errorRow}>
                  <Papicons name="Warning" size={16} color="#EF4444" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit */}
              <Pressable onPress={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
                <LinearGradient
                  colors={[VIOLET, CYAN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Papicons name={mode === 'login' ? 'Login' : 'Plus'} size={20} color="#FFFFFF" />
                      <Text style={s.submitText}>
                        {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Toggle login/signup */}
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>
                  {mode === 'login' ? 'Première fois ?' : 'Déjà un compte ?'}
                </Text>
                <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
                  <Text style={s.toggleAction}>
                    {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                  </Text>
                </Pressable>
              </View>

              {/* Separator */}
              <View style={s.separatorRow}>
                <View style={s.separatorLine} />
                <Text style={s.separatorText}>ou</Text>
                <View style={s.separatorLine} />
              </View>

              {/* Child PIN access */}
              <Pressable onPress={onNavigatePin}>
                <View style={s.pinRow}>
                  <View style={s.pinIcon}>
                    <Text style={{ fontSize: 18 }}>🎒</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pinTitle}>Accès enfant</Text>
                    <Text style={s.pinSub}>Connexion avec code PIN</Text>
                  </View>
                  <Papicons name="ChevronRight" size={18} color="rgba(255,255,255,0.3)" />
                </View>
              </Pressable>

              {/* Demo mode */}
              <Pressable onPress={enterDemoMode} style={s.demoBtn}>
                <Text style={s.demoText}>Explorer en mode démo</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  logoSection: { alignItems: 'center', paddingTop: SH * 0.08, marginBottom: 32 },
  tagline: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 10, letterSpacing: 0.3 },
  form: { paddingHorizontal: 28, gap: 14 },
  formTitle: { fontFamily: FontFamily.sansBold, fontSize: 20, color: '#FFFFFF', marginBottom: 2 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: INPUT_BG, borderWidth: 1, borderColor: INPUT_BORDER, gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  forgotText: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, backgroundColor: 'rgba(239,68,68,0.15)', gap: 8 },
  errorText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#EF4444', flex: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  submitText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2 },
  toggleLabel: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  toggleAction: { fontFamily: FontFamily.sansBold, fontSize: 13, color: CYAN },
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  separatorLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  separatorText: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.40)', marginHorizontal: 16 },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 10,
  },
  pinIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  pinTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  pinSub: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  demoBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  demoText: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
});
