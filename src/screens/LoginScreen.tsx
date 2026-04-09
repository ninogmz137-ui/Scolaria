/**
 * LoginScreen — Cinematic login.
 *
 * Dark navy gradient + violet/cyan halos.
 * Inline logo "Scolar" white + "ia" cyan + sparkle.
 * Glass fields, gradient CTA, maxWidth 400.
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
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Constants ──────────────────────────────────────────

const VIOLET = '#6366F1';
const CYAN = '#22D3EE';
const ICON_COLOR = 'rgba(255,255,255,0.3)';

// Web: remove browser default white bg + blue outline on inputs
const WEB_INPUT_FIX = Platform.OS === 'web'
  ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
  : undefined;

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const inputStyle = (field: string) => [
    s.inputRow,
    focusedField === field && s.inputRowFocused,
  ];

  return (
    <View style={s.root}>
      {/* Background gradient */}
      <LinearGradient colors={['#0B1628', '#162240']} style={StyleSheet.absoluteFill} />

      {/* Decorative halos */}
      <View style={s.haloViolet} />
      <View style={s.haloCyan} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              s.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Logo */}
            <View style={s.logoSection}>
              <Text style={s.logoText}>
                Scolar<Text style={s.logoCyan}>ia</Text>
                <Text style={s.sparkle}>✦</Text>
              </Text>
              <Text style={s.tagline}>Le copilote éducatif des familles</Text>
            </View>

            {/* Form */}
            <View style={s.form}>
              {/* Family name (signup only) */}
              {mode === 'signup' && (
                <View style={inputStyle('family')}>
                  <User size={20} color={ICON_COLOR} strokeWidth={1.5} />
                  <TextInput
                    style={[s.input, WEB_INPUT_FIX]}
                    placeholder="Nom de famille"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={familyName}
                    onChangeText={setFamilyName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('family')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              {/* Email */}
              <View style={inputStyle('email')}>
                <Mail size={20} color={ICON_COLOR} strokeWidth={1.5} />
                <TextInput
                  style={[s.input, WEB_INPUT_FIX]}
                  placeholder="Adresse email"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View style={inputStyle('password')}>
                <Lock size={20} color={ICON_COLOR} strokeWidth={1.5} />
                <TextInput
                  style={[s.input, WEB_INPUT_FIX]}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword
                    ? <EyeOff size={20} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                    : <Eye size={20} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                  }
                </Pressable>
              </View>

              {/* Forgot password */}
              {mode === 'login' && (
                <Pressable style={s.forgotBtn}>
                  <Text style={s.forgotText}>Mot de passe oublié ?</Text>
                </Pressable>
              )}

              {/* Error */}
              {error ? (
                <View style={s.errorRow}>
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit */}
              <Pressable onPress={handleSubmit} disabled={loading}>
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
                  {mode === 'login' ? 'Première fois ? ' : 'Déjà un compte ? '}
                </Text>
                <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
                  <Text style={s.toggleAction}>
                    {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                  </Text>
                </Pressable>
              </View>

              {/* Demo mode */}
              <Pressable onPress={enterDemoMode} style={s.demoBtn}>
                <Text style={s.demoBtnText}>Essayer la démo</Text>
                <Text style={s.demoSubText}>Explorez l'app avec des données fictives</Text>
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

  // Halos
  haloViolet: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: -60,
    right: -80,
    opacity: 0.8,
  },
  haloCyan: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(6,182,212,0.08)',
    bottom: 120,
    left: -60,
    opacity: 0.7,
  },

  // Scroll / container
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  container: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 32,
  },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 46,
    color: '#FFFFFF',
  },
  logoCyan: {
    color: CYAN,
  },
  sparkle: {
    fontSize: 18,
    color: CYAN,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Form
  form: {},

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    gap: 14,
  },
  inputRowFocused: {
    borderColor: 'rgba(139,92,246,0.4)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    paddingVertical: 16,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: FontFamily.sansMedium,
    color: 'rgba(255,255,255,0.35)',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    gap: 8,
    marginBottom: 16,
  },
  errorText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#EF4444', flex: 1 },

  // Submit
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: VIOLET,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      default: {
        shadowColor: VIOLET,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  submitText: { fontFamily: FontFamily.sansBold, fontSize: 16, color: '#FFFFFF' },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  toggleLabel: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: 'rgba(255,255,255,0.35)' },
  toggleAction: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: CYAN },

  // Demo
  demoBtn: {
    alignSelf: 'center',
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  demoBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  demoSubText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
});
