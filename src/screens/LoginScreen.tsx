/**
 * LoginScreen — Épure totale v3.
 *
 * Fond #FAFAF8. Flex top vide. 3 sparkles animés au-dessus du wordmark.
 * Wordmark : Scolar (navy) + ia (violet plein) en Text, ✦ au-dessus (sparkles).
 * CTA pill navy "Se connecter" (toggle formulaire email),
 * CTA pill outline "Créer un compte", lien démo, mention légale.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

// ─── Tokens ─────────────────────────────────────────────

const BG = '#FAFAF8';
const NAVY = '#1A2340';
const VIOLET = '#7C3AED';
const CYAN = '#06B6D4';

const WEB_INPUT_FIX = Platform.OS === 'web'
  ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
  : undefined;

// ─── Wordmark ─────────────────────────────────────────────

/** Pas de gradient/mask/SVG sur « ia » (Android affichait un carré) — Text plein partout. */
function Wordmark({ height = 46 }: { height?: number }) {
  const fontSize = Math.round(height * 0.88);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize, color: NAVY }}>Scolar</Text>
      <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize, color: VIOLET }}>ia</Text>
    </View>
  );
}

// ─── Floating sparkle ───────────────────────────────────

function Sparkle({
  size,
  left,
  top,
  delay,
}: { size: number; left: number; top: number; delay: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(t.value, [0, 1], [0, -6]),
      },
    ],
    opacity: interpolate(t.value, [0, 1], [0.65, 1]),
  }));

  if (Platform.OS === 'android') {
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left,
            top,
          },
          animatedStyle,
        ]}
      >
        <Text style={{ fontFamily: FontFamily.displayBold, fontSize: size * 0.65, color: '#7C3AED' }}>✦</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
        },
        animatedStyle,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <SvgLinearGradient id={`sparkleG-${size}-${left}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={VIOLET} />
            <Stop offset="1" stopColor={CYAN} />
          </SvgLinearGradient>
        </Defs>
        <SvgText
          x="12"
          y="19"
          textAnchor="middle"
          fontSize="22"
          fill={`url(#sparkleG-${size}-${left})`}
        >
          ✦
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

// ─── Component ──────────────────────────────────────────

interface Props {
  onNavigatePin: () => void;
}

export default function LoginScreen({ onNavigatePin }: Props) {
  const { signIn, enterDemoMode } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: winH } = Dimensions.get('window');
  const [serifLoaded] = useFonts({ DMSerifDisplay_400Regular });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Scolaria — Connexion';
    }
  }, []);

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.scrollContent,
            {
              minHeight: winH,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, TAB_BAR_SCROLL_PADDING),
            },
          ]}
        >
          <View style={s.column}>
            <View style={s.logoWrap}>
              <View style={s.sparkleLayer} pointerEvents="none">
                <Sparkle size={22} left={4} top={2} delay={0} />
                <Sparkle size={13} left={52} top={-10} delay={600} />
                <Sparkle size={10} left={92} top={8} delay={1200} />
              </View>
              {serifLoaded ? <Wordmark height={46} /> : <View style={{ height: 46 }} />}
            </View>

            <View style={s.actions}>
              {!showEmail ? (
                <>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      style={[s.btnPrimary, s.actionAfterPrimary]}
                      onPress={() => setShowEmail(true)}
                    >
                      <Text style={s.btnPrimaryText}>Se connecter</Text>
                    </TouchableOpacity>
                  ) : (
                    <Pressable
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                      style={({ pressed }) => [
                        s.btnPrimary,
                        s.actionAfterPrimary,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => setShowEmail(true)}
                    >
                      <Text style={s.btnPrimaryText}>Se connecter</Text>
                    </Pressable>
                  )}

                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[s.btnSecondary, s.actionAfterSecondary]}
                      onPress={onNavigatePin}
                    >
                      <Text style={s.btnSecondaryText}>Créer un compte</Text>
                    </TouchableOpacity>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        s.btnSecondary,
                        s.actionAfterSecondary,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={onNavigatePin}
                    >
                      <Text style={s.btnSecondaryText}>Créer un compte</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={enterDemoMode} hitSlop={10} style={s.demoLinkWrap}>
                    <Text style={s.demoLink}>Essayer en mode démo</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={[s.field, s.actionAfterPrimary]}>
                    <TextInput
                      style={[s.fieldInput, WEB_INPUT_FIX]}
                      placeholder="Adresse email"
                      placeholderTextColor="rgba(26,35,64,0.35)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={[s.field, s.actionAfterSecondary]}>
                    <TextInput
                      style={[s.fieldInput, WEB_INPUT_FIX]}
                      placeholder="Mot de passe"
                      placeholderTextColor="rgba(26,35,64,0.35)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="password"
                    />
                  </View>

                  {error ? <Text style={s.errorText}>{error}</Text> : null}

                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      style={[s.btnPrimary, s.actionAfterPrimary, loading && { opacity: 0.7 }]}
                      onPress={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={s.btnPrimaryText}>Connexion</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Pressable
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                      style={({ pressed }) => [s.btnPrimary, s.actionAfterPrimary, pressed && { opacity: 0.9 }]}
                      onPress={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={s.btnPrimaryText}>Connexion</Text>
                      )}
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => {
                      setShowEmail(false);
                      setError('');
                    }}
                    hitSlop={10}
                    style={s.demoLinkWrap}
                  >
                    <Text style={s.demoLink}>Retour</Text>
                  </Pressable>
                </>
              )}
            </View>

            <Text style={s.legal}>
              En continuant, vous acceptez les conditions et la politique de confidentialité.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  kav: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  column: { width: '100%', flexShrink: 0 },

  // Logo + sparkles
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'visible',
  },
  sparkleLayer: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 130,
    height: 44,
    zIndex: 1,
    overflow: 'visible',
  },

  // Actions block (no `gap` — unreliable on some Android flex layouts)
  actions: {
    marginTop: 28,
    paddingHorizontal: 16,
    width: '100%',
    alignSelf: 'center',
    flexShrink: 0,
  },
  actionAfterPrimary: {
    marginBottom: 12,
  },
  actionAfterSecondary: {
    marginBottom: 12,
  },
  btnPrimary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A2340',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 2,
    elevation: 0,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  btnSecondary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnSecondaryText: {
    color: NAVY,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  demoLinkWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  demoLink: {
    fontSize: 13,
    color: 'rgba(26,35,64,0.45)',
    fontFamily: FontFamily.sansMedium,
  },

  // Email fields
  field: {
    height: 56,
    borderRadius: 100,
    backgroundColor: 'rgba(26,35,64,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(26,35,64,0.10)',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  fieldInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: NAVY,
  },
  errorText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -4,
  },

  // Legal
  legal: {
    fontSize: 11,
    color: 'rgba(26,35,64,0.35)',
    fontFamily: FontFamily.sansRegular,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginTop: 24,
  },
});
