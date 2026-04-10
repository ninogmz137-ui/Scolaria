/**
 * LoginScreen — Épure totale v3.
 *
 * Fond #FAFAF8. Flex top vide. 3 sparkles animés au-dessus du wordmark.
 * Wordmark inline SVG (Scolar navy + ia gradient violet→cyan + ✦).
 * CTA pill navy "Se connecter" (toggle formulaire email),
 * CTA pill outline "Créer un compte", lien démo, mention légale.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Tokens ─────────────────────────────────────────────

const BG = '#FAFAF8';
const NAVY = '#1A2340';
const VIOLET = '#7C3AED';
const CYAN = '#06B6D4';

const WEB_INPUT_FIX = Platform.OS === 'web'
  ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
  : undefined;

// ─── Wordmark inline ────────────────────────────────────

function WordmarkLight({ height = 46 }: { height?: number }) {
  const vbW = 280;
  const vbH = 64;
  const width = (vbW / vbH) * height;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vbW} ${vbH}`}>
      <Defs>
        <SvgLinearGradient id="iaG" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={VIOLET} />
          <Stop offset="1" stopColor={CYAN} />
        </SvgLinearGradient>
        <SvgLinearGradient id="sparkG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={VIOLET} />
          <Stop offset="1" stopColor={CYAN} />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        x="140"
        y="50"
        textAnchor="middle"
        fontFamily="DMSerifDisplay_400Regular"
        fontSize="52"
        letterSpacing="-0.5"
        fill={NAVY}
      >
        Scolar
        <TSpan fill="url(#iaG)">ia</TSpan>
      </SvgText>
      <SvgText x="191" y="22" fontSize="15" fill="url(#sparkG)">
        ✦
      </SvgText>
    </Svg>
  );
}

// ─── Floating sparkle ───────────────────────────────────

function Sparkle({
  size,
  left,
  top,
  delay,
}: { size: number; left: number; top: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        transform: [{ translateY }],
        opacity,
      }}
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
  const [serifLoaded] = useFonts({ DMSerifDisplay_400Regular });

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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Espace vide en haut */}
        <View style={{ flex: 1 }} />

        {/* Zone logo + sparkles */}
        <View style={s.logoWrap}>
          <View style={s.sparkleLayer} pointerEvents="none">
            <Sparkle size={22} left={-46} top={-4} delay={0} />
            <Sparkle size={13} left={18} top={-18} delay={600} />
            <Sparkle size={10} left={42} top={6} delay={1200} />
          </View>
          {serifLoaded ? <WordmarkLight height={46} /> : <View style={{ height: 46 }} />}
        </View>

        {/* Bloc actions */}
        <View style={s.actions}>
          {!showEmail ? (
            <>
              <Pressable
                style={({ pressed }) => [s.btnPrimary, pressed && { opacity: 0.9 }]}
                onPress={() => setShowEmail(true)}
              >
                <Text style={s.btnPrimaryText}>Se connecter</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [s.btnSecondary, pressed && { opacity: 0.7 }]}
                onPress={onNavigatePin}
              >
                <Text style={s.btnSecondaryText}>Créer un compte</Text>
              </Pressable>

              <Pressable onPress={enterDemoMode} hitSlop={10} style={s.demoLinkWrap}>
                <Text style={s.demoLink}>Essayer en mode démo</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={s.field}>
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

              <View style={s.field}>
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

              <Pressable
                style={({ pressed }) => [s.btnPrimary, pressed && { opacity: 0.9 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.btnPrimaryText}>Connexion</Text>
                )}
              </Pressable>

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

        {/* Mention légale */}
        <Text style={s.legal}>
          En continuant, vous acceptez les conditions et la politique de confidentialité.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Logo + sparkles
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleLayer: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions block
  actions: {
    marginTop: 32,
    paddingHorizontal: 28,
    gap: 12,
  },
  btnPrimary: {
    height: 56,
    borderRadius: 100,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  btnSecondary: {
    height: 56,
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(26,35,64,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: NAVY,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  demoLinkWrap: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  demoLink: {
    fontSize: 13,
    color: 'rgba(26,35,64,0.32)',
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
    color: 'rgba(26,35,64,0.22)',
    fontFamily: FontFamily.sansRegular,
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 32,
    marginTop: 24,
  },
});
