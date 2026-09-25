/**
 * PinScreen — child access via 4-digit PIN.
 *
 * This screen is used when the user taps "Accès enfant" from the login flow.
 * For now, it switches the app role to `enfant-pin` once a 4-digit PIN is entered.
 *
 * Design : fond #F2F1EE, texte #0F172A, champ COMPONENTS.md §5, bouton pill §2.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, LockKeyhole, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Text, TextInput, Pressable } from '../components/ui';

interface Props {
  onBack?: () => void;
}

const BG = '#F2F1EE';
const INK = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';
const TEXT35 = 'rgba(15,23,42,0.35)';

// Web: remove browser default white bg + blue outline on inputs
const WEB_INPUT_FIX =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
    : undefined;

function normalizePin(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 4);
}

export default function PinScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { enterChildMode } = useAuth();
  const navigation = useNavigation<any>();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

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
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              s.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Pressable
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={s.backBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <ArrowLeft size={20} color={TEXT55} strokeWidth={2} />
              <Text style={s.backText}>Retour</Text>
            </Pressable>

            <View style={s.header}>
              <Text style={s.title}>Accès enfant</Text>
              <Text style={s.subtitle}>
                Saisissez le code PIN pour ouvrir l’espace élève primaire.
              </Text>
            </View>

            {/* Champ PIN — input standard §5 (points à la place des chiffres) */}
            <View style={[s.input, focused && s.inputFocused]}>
              <LockKeyhole size={20} color={TEXT35} strokeWidth={2} />
              <TextInput
                value={pin}
                onChangeText={(v) => {
                  setError('');
                  setPin(normalizePin(v));
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
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
                  <View key={idx} style={[s.dot, isOn ? s.dotOn : s.dotOff]} />
                ))}
              </View>
            </View>

            {error ? (
              <View style={s.errorRow}>
                <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Bouton primaire §2 */}
            <Pressable
              onPress={handleSubmit}
              style={s.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnText}>Continuer</Text>
            </Pressable>

            <Text style={s.hint}>
              Astuce : sur démo/local, n’importe quels 4 chiffres fonctionnent.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
  },

  // Ghost « ‹ Retour »
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: 12,
  },
  backText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: TEXT55,
    marginLeft: 6,
  },

  header: { marginTop: 12, marginBottom: 20 },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.8,
    color: INK,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    color: TEXT55,
  },

  // Input standard §5
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  inputFocused: {
    borderColor: '#4338CA',
    borderWidth: 1.5,
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
    marginLeft: 14,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 12,
  },
  dotOn: { backgroundColor: INK },
  dotOff: { backgroundColor: 'rgba(15,23,42,0.12)' },

  errorRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  errorText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
    marginLeft: 8,
  },

  // Bouton primaire §2
  primaryBtn: {
    marginTop: 24,
    height: 52,
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: '#FFFFFF' },

  hint: {
    marginTop: 16,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: TEXT35,
    textAlign: 'center',
  },
});
