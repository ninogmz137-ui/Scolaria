import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useAuth, type UserRole } from '../contexts/AuthContext';

const BG = '#F2F1EE';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';

type DbRole = 'parent' | 'enseignant' | 'eleve';

function isDbRole(v: unknown): v is DbRole {
  return v === 'parent' || v === 'enseignant' || v === 'eleve';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export default function ConnexionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<'email' | 'password' | null>(null);

  const canSubmit = useMemo(() => {
    return normalizeEmail(email).length > 3 && password.trim().length >= 1 && !submitting;
  }, [email, password, submitting]);

  const submit = async () => {
    setError('');
    const e = normalizeEmail(email);
    const p = password;

    if (!e || !p) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });
      if (signInError) throw signInError;

      const userId = data.user?.id;
      if (!userId) {
        throw new Error("Impossible de récupérer l'utilisateur.");
      }

      // Role lookup: prefer `users.role` (prompt spec), fallback to user_metadata.role.
      let nextRole: UserRole | null = null;
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profileError && isDbRole(profile?.role)) {
        nextRole = profile.role;
      } else {
        const metaRole = data.user?.user_metadata?.role;
        if (metaRole === 'enseignant' || metaRole === 'eleve') nextRole = metaRole;
        else nextRole = 'parent';
      }

      setRole(nextRole);

      // Keep the explicit redirects requested by the sprint.
      switch (nextRole) {
        case 'parent':
          navigation.replace('MainPager');
          break;
        case 'enseignant':
          navigation.replace('EnseignantDashboard');
          break;
        case 'eleve':
          navigation.replace('EleveSpace');
          break;
        default:
          navigation.replace('MainPager');
          break;
      }
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.');
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header simple (no top nav) */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
        </Pressable>

        <Text style={styles.headerTitle}>Connexion</Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      <View style={styles.body}>
        <TextInput
          style={[
            styles.input,
            focus === 'email' && { borderColor: INDIGO, borderWidth: 1.5 },
          ]}
          placeholder="adresse@email.com"
          placeholderTextColor="rgba(15,23,42,0.30)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(v) => {
            setError('');
            setEmail(v);
          }}
          onFocus={() => setFocus('email')}
          onBlur={() => setFocus((v) => (v === 'email' ? null : v))}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              focus === 'password' && { borderColor: INDIGO, borderWidth: 1.5 },
            ]}
            placeholder="mot de passe"
            placeholderTextColor="rgba(15,23,42,0.30)"
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(v) => {
              setError('');
              setPassword(v);
            }}
            onFocus={() => setFocus('password')}
            onBlur={() => setFocus((v) => (v === 'password' ? null : v))}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={styles.eyeBtn}
          >
            {showPassword ? (
              <EyeOff size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
            ) : (
              <Eye size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
            )}
          </Pressable>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {}}
          style={styles.forgotWrap}
          accessibilityRole="button"
        >
          <Text style={styles.forgot}>Mot de passe oublié</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryBtn, !canSubmit && { opacity: 0.65 }]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: NAVY,
    letterSpacing: -0.3,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: NAVY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as any)
      : null),
  },
  passwordWrap: {
    marginTop: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  forgot: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: INDIGO,
  },
  primaryBtn: {
    marginTop: 28,
    width: '100%',
    maxWidth: 240,
    height: 52,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  error: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: '#EF4444',
  },
});

