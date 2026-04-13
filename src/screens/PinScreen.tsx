/**
 * PinScreen — child access via 4-digit PIN.
 *
 * This screen is used when the user taps "Accès enfant" from the login flow.
 * For now, it switches the app role to `enfant-pin` once a 4-digit PIN is entered.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, LockKeyhole, AlertCircle } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onBack: () => void;
}

const VIOLET = '#6366F1';
const CYAN = '#22D3EE';
const ICON_COLOR = 'rgba(255,255,255,0.3)';

// Web: remove browser default white bg + blue outline on inputs
const WEB_INPUT_FIX =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
    : undefined;

function normalizePin(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 4);
}

export default function PinScreen({ onBack }: Props) {
  const { enterChildMode } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const dots = useMemo(() => {
    const filled = pin.length;
    return Array.from({ length: 4 }, (_, i) => i < filled);
  }, [pin]);

  const handleSubmit = () => {
    setError('');
    if (pin.length !== 4) {
      setError('Entrez un code PIN à 4 chiffres.');
      return;
    }
    // Phase 2+: validate against stored child PIN. For now, any 4 digits unlocks child sandbox.
    enterChildMode();
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0B1628', '#162240']} style={StyleSheet.absoluteFill} />

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
            <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
              <ArrowLeft size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={s.backText}>Retour</Text>
            </Pressable>

            <View style={s.header}>
              <Text style={s.title}>
                Accès enfant <Text style={s.sparkle}>✦</Text>
              </Text>
              <Text style={s.subtitle}>
                Saisissez le code PIN pour ouvrir l’espace élève primaire.
              </Text>
            </View>

            <View style={s.card}>
              <View style={s.pinRow}>
                <LockKeyhole size={20} color={ICON_COLOR} strokeWidth={1.75} />
                <TextInput
                  value={pin}
                  onChangeText={(v) => {
                    setError('');
                    setPin(normalizePin(v));
                  }}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoFocus
                  style={[s.hiddenInput, WEB_INPUT_FIX]}
                  maxLength={4}
                  secureTextEntry
                  accessibilityLabel="Code PIN"
                />
                <View style={s.dotsRow} pointerEvents="none">
                  {dots.map((isOn, idx) => (
                    <View
                      key={idx}
                      style={[
                        s.dot,
                        isOn ? s.dotOn : s.dotOff,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {error ? (
                <View style={s.errorRow}>
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable onPress={handleSubmit} style={{ marginTop: 18 }}>
                <LinearGradient
                  colors={[VIOLET, CYAN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitBtn}
                >
                  <Text style={s.submitText}>Continuer</Text>
                </LinearGradient>
              </Pressable>

              <Text style={s.hint}>
                Astuce: sur démo/local, n’importe quels 4 chiffres fonctionnent.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  haloViolet: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: -70,
    right: -95,
    opacity: 0.85,
  },
  haloCyan: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(6,182,212,0.08)',
    bottom: 120,
    left: -70,
    opacity: 0.75,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: TAB_BAR_SCROLL_PADDING,
  },
  container: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 28,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  backText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  header: { marginTop: 18, marginBottom: 18 },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sparkle: { fontSize: 14, color: CYAN },
  subtitle: {
    marginTop: 8,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.45)',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 18,
  },

  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    flex: 1,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  dotOn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  dotOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
  },

  errorRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    gap: 8,
  },
  errorText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },

  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  submitText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },

  hint: {
    marginTop: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.30)',
    textAlign: 'center',
  },
});

