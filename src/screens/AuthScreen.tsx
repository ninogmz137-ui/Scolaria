import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import LogoScolaria from '../components/LogoScolaria';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp, enterDemoMode } = useAuth();
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
      className="flex-1 bg-blue-night"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: TAB_BAR_SCROLL_PADDING }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo header */}
        <LinearGradient
          colors={[Colors.violet, Colors.blueNight]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 40 }}
        >
          <LogoScolaria size={72} variant="dark" />
        </LinearGradient>

        {/* Form */}
        <View className="px-7 pt-2">
          <Text className="text-2xl font-extrabold text-white">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </Text>
          <Text className="text-sm text-gray-400 mb-7">
            {mode === 'login'
              ? 'Accédez au suivi scolaire de vos enfants'
              : 'Rejoignez Scolaria en quelques secondes'}
          </Text>

          {/* Family name (signup only) */}
          {mode === 'signup' && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-300 mb-2">
                Nom de famille
              </Text>
              <View className="flex-row items-center bg-blue-night-card rounded-xl border border-white/10 px-3.5 gap-2.5">
                <Ionicons name="people" size={20} color={Colors.gray} />
                <TextInput
                  className="flex-1 text-white text-sm py-3.5"
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
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-300 mb-2">
              Email
            </Text>
            <View className="flex-row items-center bg-blue-night-card rounded-xl border border-white/10 px-3.5 gap-2.5">
              <Ionicons name="mail" size={20} color={Colors.gray} />
              <TextInput
                className="flex-1 text-white text-sm py-3.5"
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
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-300 mb-2">
              Mot de passe
            </Text>
            <View className="flex-row items-center bg-blue-night-card rounded-xl border border-white/10 px-3.5 gap-2.5">
              <Ionicons name="lock-closed" size={20} color={Colors.gray} />
              <TextInput
                className="flex-1 text-white text-sm py-3.5"
                placeholder="••••••••"
                placeholderTextColor={Colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.gray}
                />
              </Pressable>
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <View className="flex-row items-center gap-2 bg-red-500/10 p-3 rounded-xl mb-4">
              <Ionicons name="alert-circle" size={16} color={Colors.red} />
              <Text className="text-xs text-red-400 flex-1">{error}</Text>
            </View>
          ) : null}

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="rounded-full overflow-hidden mt-2"
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 16,
              }}
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
                  <Text className="text-lg font-extrabold text-white">
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Toggle mode */}
          <View className="flex-row justify-center mt-6 gap-1.5">
            <Text className="text-sm text-gray-400">
              {mode === 'login'
                ? 'Pas encore de compte ?'
                : 'Déjà un compte ?'}
            </Text>
            <Pressable
              onPress={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
            >
              <Text className="text-sm font-bold" style={{ color: Colors.cyan }}>
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </Text>
            </Pressable>
          </View>

          {/* Demo mode button */}
          <Pressable
            onPress={enterDemoMode}
            className="flex-row items-center justify-center gap-2 mt-5 mb-10 py-3.5 rounded-full border border-cyan-400/25 bg-cyan-400/5"
          >
            <Ionicons name="flask" size={18} color={Colors.cyan} />
            <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>
              Explorer en mode démo
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
