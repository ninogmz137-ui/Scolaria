import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Pressable, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const BG = '#F7F7F5';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';

type Role = 'parent' | 'enseignant';

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'parent',     label: 'Parent',      desc: 'Suivre la scolarité de mes enfants' },
  { id: 'enseignant', label: 'Enseignant',   desc: 'Gérer ma classe et communiquer' },
];

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }

export default function InscriptionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { signUp, setRole } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role>('parent');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<string | null>(null);

  const canGoStep2 = familyName.trim().length >= 2;

  const canSubmit = useMemo(() =>
    normalizeEmail(email).includes('@') &&
    password.length >= 6 &&
    !submitting,
  [email, password, submitting]);

  const submit = async () => {
    setError('');
    const e = normalizeEmail(email);
    if (!e || password.length < 6) {
      setError('Email invalide ou mot de passe trop court (6 caractères min).');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(e, password, familyName.trim());
      setRole(selectedRole);
      const target = selectedRole === 'enseignant' ? 'EnseignantDashboard' : 'MainPager';
      navigation.replace(target);
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      if (msg.includes('already registered')) setError('Cet email est déjà utilisé.');
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Créer un compte</Text>
        <View style={{ width: 44, height: 44 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            {/* Étape 1 — Rôle + Nom */}
            <Text style={styles.stepTitle}>Qui êtes-vous ?</Text>

            {ROLES.map(r => (
              <Pressable
                key={r.id}
                onPress={() => setSelectedRole(r.id)}
                style={[styles.roleCard, selectedRole === r.id && styles.roleCardActive]}
              >
                <View style={styles.roleRadio}>
                  {selectedRole === r.id && <View style={styles.roleRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, selectedRole === r.id && { color: INDIGO }]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
              </Pressable>
            ))}

            <View style={{ height: 24 }} />

            <Text style={styles.fieldLabel}>
              {selectedRole === 'enseignant' ? 'Votre nom' : 'Nom de famille'}
            </Text>
            <TextInput
              style={[styles.input, focus === 'family' && styles.inputFocused]}
              placeholder={selectedRole === 'enseignant' ? 'Ex: Laurent' : 'Ex: Moreau'}
              placeholderTextColor="rgba(15,23,42,0.30)"
              autoCapitalize="words"
              value={familyName}
              onChangeText={v => { setError(''); setFamilyName(v); }}
              onFocus={() => setFocus('family')}
              onBlur={() => setFocus(null)}
            />

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryBtn, { marginTop: 32 }, !canGoStep2 && { opacity: 0.55 }]}
              onPress={() => canGoStep2 && setStep(2)}
              disabled={!canGoStep2}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Continuer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Étape 2 — Email + Password */}
            <Text style={styles.stepTitle}>Vos identifiants</Text>

            <Text style={styles.fieldLabel}>Adresse email</Text>
            <TextInput
              style={[styles.input, focus === 'email' && styles.inputFocused]}
              placeholder="adresse@email.com"
              placeholderTextColor="rgba(15,23,42,0.30)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={v => { setError(''); setEmail(v); }}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus(null)}
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Mot de passe</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, focus === 'password' && styles.inputFocused]}
                placeholder="6 caractères minimum"
                placeholderTextColor="rgba(15,23,42,0.30)"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={v => { setError(''); setPassword(v); }}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                hitSlop={10}
                style={styles.eyeBtn}
                accessibilityRole="button"
              >
                {showPassword
                  ? <EyeOff size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
                  : <Eye size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />}
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryBtn, { marginTop: 32 }, !canSubmit && { opacity: 0.55 }]}
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {submitting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.primaryBtnText}>Créer mon compte</Text>}
            </TouchableOpacity>

            <Text style={styles.legal}>
              En créant un compte, vous acceptez nos conditions d'utilisation
              et notre politique de confidentialité.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    height: 56, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: 'Figtree_700Bold', fontSize: 14,
    color: NAVY, letterSpacing: -0.3,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 16, gap: 8,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  stepDotActive: { backgroundColor: INDIGO },
  stepLine: {
    width: 32, height: 1,
    backgroundColor: 'rgba(15,23,42,0.10)',
  },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  stepTitle: {
    fontFamily: 'Figtree_700Bold', fontSize: 20,
    color: NAVY, marginBottom: 20, letterSpacing: -0.4,
  },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.08)',
    padding: 16, marginBottom: 10, gap: 14,
  },
  roleCardActive: {
    borderColor: INDIGO,
    backgroundColor: 'rgba(67,56,202,0.04)',
  },
  roleRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: 'rgba(15,23,42,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleRadioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: INDIGO,
  },
  roleLabel: {
    fontFamily: 'Figtree_600SemiBold', fontSize: 15, color: NAVY,
  },
  roleDesc: {
    fontFamily: 'Figtree_400Regular', fontSize: 12,
    color: 'rgba(15,23,42,0.50)', marginTop: 2,
  },
  fieldLabel: {
    fontFamily: 'Figtree_500Medium', fontSize: 13,
    color: 'rgba(15,23,42,0.55)', marginBottom: 8,
  },
  input: {
    height: 52, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)',
    fontFamily: 'Figtree_400Regular', fontSize: 15, color: NAVY,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  inputFocused: { borderColor: INDIGO, borderWidth: 1.5 },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute', right: 8,
    width: 40, height: 40, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%', maxWidth: 280, height: 52,
    borderRadius: 999, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Figtree_600SemiBold', fontSize: 15,
    color: '#FFFFFF', letterSpacing: -0.2,
  },
  error: {
    marginTop: 10, textAlign: 'center',
    fontFamily: 'Figtree_400Regular', fontSize: 12, color: '#EF4444',
  },
  legal: {
    marginTop: 20, textAlign: 'center',
    fontFamily: 'Figtree_400Regular', fontSize: 11,
    color: 'rgba(15,23,42,0.30)', lineHeight: 16,
  },
});
