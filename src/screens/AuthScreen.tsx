import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (mode === 'signup' && !familyName.trim()) {
      setError('Le nom de famille est requis.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, familyName.trim());
        Alert.alert(
          'Compte créé !',
          'Vérifiez votre email pour confirmer votre inscription.',
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      if (msg.includes('Invalid login')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('already registered')) {
        setError('Cet email est déjà utilisé.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo header */}
        <LinearGradient
          colors={[Colors.violet, Colors.blueNight]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.appName}>Scolaria</Text>
          <Text style={styles.tagline}>
            Le passeport scolaire numérique
          </Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </Text>
          <Text style={styles.formSubtitle}>
            {mode === 'login'
              ? 'Accédez au suivi scolaire de vos enfants'
              : 'Rejoignez Scolaria en quelques secondes'}
          </Text>

          {/* Family name (signup only) */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de famille</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="people" size={20} color={Colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Moreau"
                  placeholderTextColor={Colors.gray}
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color={Colors.gray} />
              <TextInput
                style={styles.input}
                placeholder="parent@email.fr"
                placeholderTextColor={Colors.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={Colors.gray} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.gray}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={mode === 'login' ? 'log-in' : 'person-add'}
                    size={22}
                    color={Colors.white}
                  />
                  <Text style={styles.submitText}>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
          >
            <Text style={styles.toggleText}>
              {mode === 'login'
                ? 'Pas encore de compte ?'
                : 'Déjà un compte ?'}
            </Text>
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          {/* Demo mode hint */}
          <View style={styles.demoHint}>
            <Ionicons name="information-circle" size={16} color={Colors.cyan} />
            <Text style={styles.demoText}>
              Sans configuration Supabase, l'app fonctionne en mode démo
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  scroll: {
    flexGrow: 1,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.cyan,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  // Form
  form: {
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lightGray,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 14,
  },
  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: Colors.red,
    flex: 1,
  },
  // Submit
  submitButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
  },
  // Toggle
  toggleMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.gray,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.cyan,
  },
  // Demo hint
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 40,
  },
  demoText: {
    fontSize: 12,
    color: Colors.gray,
  },
});
