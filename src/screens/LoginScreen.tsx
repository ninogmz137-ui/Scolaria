/**
 * LoginScreen — Premium cinematic login.
 *
 * Background: deep navy gradient + decorative luminous halos.
 * Inline logo "Scolar" white + "ia" cyan. Glass fields without labels.
 * Gradient CTA, maxWidth 380 for web.
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
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Constants ──────────────────────────────────────────

const INPUT_BG = 'rgba(255,255,255,0.10)';
const INPUT_BORDER = 'rgba(255,255,255,0.18)';
const PLACEHOLDER = 'rgba(255,255,255,0.45)';
const VIOLET = '#6366F1';
const CYAN = '#22D3EE';
const { height: SH } = Dimensions.get('window');

// ─── Decorative halo ────────────────────────────────────

function Halo({ color, size, top, left }: { color: string; size: number; top: number; left: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.18,
      }}
    />
  );
}

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
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
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

      {/* Decorative halos */}
      <Halo color={VIOLET} size={260} top={-60} left={-80} />
      <Halo color={CYAN} size={200} top={SH * 0.35} left={Dimensions.get('window').width - 60} />
      <Halo color="#A78BFA" size={180} top={SH * 0.65} left={-50} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: '100%',
              maxWidth: 380,
              paddingHorizontal: 28,
            }}
          >
            {/* Logo inline: "Scolar" white + "ia" cyan */}
            <View style={s.logoSection}>
              <Text style={s.logoText}>
                Scolar<Text style={s.logoCyan}>ia</Text>
              </Text>
              <Text style={s.tagline}>Le copilote éducatif des familles</Text>
            </View>

            {/* Form — no title, no labels */}
            <View style={s.form}>
              {/* Family name (signup only) */}
              {mode === 'signup' && (
                <View style={s.inputRow}>
                  <Papicons name="User" size={18} color="rgba(255,255,255,0.3)" />
                  <TextInput
                    style={s.input}
                    placeholder="Nom de famille"
                    placeholderTextColor={PLACEHOLDER}
                    value={familyName}
                    onChangeText={setFamilyName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Email */}
              <View style={s.inputRow}>
                <Papicons name="Send" size={18} color="rgba(255,255,255,0.3)" />
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={PLACEHOLDER}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password */}
              <View style={s.inputRow}>
                <Papicons name="Lock" size={18} color="rgba(255,255,255,0.3)" />
                <TextInput
                  style={s.input}
                  placeholder="Mot de passe"
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

              {/* Submit — gradient button, text only */}
              <Pressable onPress={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
                <LinearGradient
                  colors={[VIOLET, CYAN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.submitText}>
                      {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                    </Text>
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

  // Logo
  logoSection: { alignItems: 'center', paddingTop: SH * 0.10, marginBottom: 40 },
  logoText: {
    fontFamily: FontFamily.loraBold,
    fontSize: 42,
    color: '#FFFFFF',
  },
  logoCyan: {
    color: CYAN,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Form
  form: { gap: 14 },

  // Input row — glass style, no labels
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 15,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'underline',
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    gap: 8,
  },
  errorText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#EF4444', flex: 1 },

  // Submit
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  toggleLabel: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  toggleAction: { fontFamily: FontFamily.sansBold, fontSize: 13, color: CYAN },

  // Demo
  demoBtn: { alignSelf: 'center', marginTop: 4, paddingVertical: 8, paddingHorizontal: 16 },
  demoText: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
