/**
 * LoginScreen — Épure totale v3.
 *
 * Fond #FAFAF8. Bloc d’entête : symbole (8 ellipses, entrée animée) + wordmark
 * `<ScolariaLogo />` (Rufina, ✦ #4338CA) — légère translation pour centrage visuel.
 * CTA pill navy "Se connecter" (toggle formulaire email),
 * CTA pill outline "Créer un compte", lien démo, mention légale.
 */

import { useState, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import ScolariaLogo from '../components/ScolariaLogo';
import ScolariaSymbol from '../components/ScolariaSymbol';
// ─── Tokens ─────────────────────────────────────────────

const BG = '#FAFAF8';
const NAVY = '#0F172A';
const SYMBOL_INDIGO = '#4338CA';

const WEB_INPUT_FIX = Platform.OS === 'web'
  ? ({ backgroundColor: 'transparent', outlineStyle: 'none' } as any)
  : undefined;

// ─── Component ──────────────────────────────────────────

interface Props {
  onNavigatePin: () => void;
}

export default function LoginScreen({ onNavigatePin }: Props) {
  const { signIn, enterDemoMode } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: winH } = Dimensions.get('window');
  const bottomPad = Math.max(insets.bottom, 48);

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              paddingBottom: bottomPad,
              paddingHorizontal: 24,
            },
          ]}
        >
          <View
            style={[
              s.column,
              { marginBottom: Math.max(40, Math.round(winH * 0.06)) },
            ]}
          >
            <View style={s.logoBlock} accessibilityLabel="Scolaria">
              <View style={s.brandRow}>
                <View style={s.symbolCell}>
                  <ScolariaSymbol size={56} color={SYMBOL_INDIGO} entrance="assemble" />
                </View>
                <ScolariaLogo fontSize={40} primaryColor={NAVY} sparkleColor={SYMBOL_INDIGO} />
              </View>
            </View>

            <View style={s.actions}>
              {!showEmail ? (
                <>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      style={[s.btnPrimary, s.pillAuthIntro, s.actionAfterPrimary]}
                      onPress={() => setShowEmail(true)}
                    >
                      <Text style={s.btnPrimaryText}>Se connecter</Text>
                    </TouchableOpacity>
                  ) : (
                    <Pressable
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                      style={({ pressed }) => [
                        s.btnPrimary,
                        s.pillAuthIntro,
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
                      style={[s.btnSecondary, s.pillAuthIntro, s.actionAfterSecondary]}
                      onPress={onNavigatePin}
                    >
                      <Text style={s.btnSecondaryText}>Créer un compte</Text>
                    </TouchableOpacity>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        s.btnSecondary,
                        s.pillAuthIntro,
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
                      style={[
                        s.btnPrimary,
                        s.pillFormFull,
                        s.actionAfterPrimary,
                        loading && { opacity: 0.7 },
                      ]}
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
                      style={({ pressed }) => [
                        s.btnPrimary,
                        s.pillFormFull,
                        s.actionAfterPrimary,
                        pressed && { opacity: 0.9 },
                      ]}
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
    justifyContent: 'flex-end',
    width: '100%',
  },
  /** largeur + shrink ; marge bas en inline (~6 % hauteur écran, min 40) */
  column: {
    width: '100%',
    flexShrink: 0,
  },

  logoBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
    gap: 14,
    /** Recentre le bloc (symbole + mot) légèrement vers la gauche (alignement visuel) */
    transform: [{ translateX: -16 }],
  },
  symbolCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions block (no `gap` — unreliable on some Android flex layouts)
  actions: {
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
  /** Même largeur, centrées, ~ la moitié d’écran (un peu plus que le texte) */
  pillAuthIntro: {
    alignSelf: 'center',
    width: '48%',
    minWidth: 200,
    maxWidth: 240,
    paddingHorizontal: 20,
  },
  /** Champs + Connexion : pleine largeur */
  pillFormFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  btnPrimary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  btnSecondaryText: {
    color: NAVY,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  demoLinkWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  demoLink: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: FontFamily.sansMedium,
    textAlign: 'center',
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
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: FontFamily.sansRegular,
    textAlign: 'center',
    marginTop: 8,
  },
});
