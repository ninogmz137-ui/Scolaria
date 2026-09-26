import './src/global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import { SCREEN_BACKGROUND } from './src/constants/colors';
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import EleveTabNavigator from './src/navigation/EleveTabNavigator';
import SandboxNavigator from './src/navigation/SandboxNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ConnexionScreen from './src/screens/ConnexionScreen';
import InscriptionScreen from './src/screens/InscriptionScreen';
import PinScreen from './src/screens/PinScreen';
import ProfilIncompletScreen from './src/screens/ProfilIncompletScreen';
import { assurerProfil, type EtatProfil } from './src/services/profilService';
/** Kept for future reuse (e.g. Aria) — auto-open on Accueil disabled below. */
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { SchoolModeProvider } from './src/contexts/SchoolModeContext';
import { ActiveChildProvider } from './src/contexts/ActiveChildContext';
import { WallpaperProvider } from './src/contexts/WallpaperContext';
import { DemoProvider } from './src/contexts/DemoContext';
import { cancelConseilDuMatin } from './src/services/notifications';
import { useSolariaFonts } from './src/hooks/useSolariaFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import NotificationsRouteur from './src/components/NotificationsRouteur';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

type RootStackParamList = {
  Login: undefined;
  Connexion: undefined;
  Inscription: undefined;
  Pin: undefined;
  MainPager: undefined;
  EnseignantDashboard: undefined;
  EleveSpace: undefined;
  Sandbox: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

function AppContent({ navigationRef }: { navigationRef: NavigationContainerRef<RootStackParamList> }) {
  const { user, loading, role, isDemo, signOut } = useAuth();

  // Compte réel sans profil (inscription interrompue) : l'app termine l'inscription d'un parent,
  // sinon écran clair — jamais d'écran blanc (R2, 26 sept 2026).
  // Vérifié une fois par COMPTE (user.id) : l'objet user change à chaque rafraîchissement du jeton,
  // ce qui ne doit ni rejouer la vérification ni démonter la navigation.
  const [etatProfil, setEtatProfil] = useState<'verification' | EtatProfil>('verification');
  const userRef = useRef(user);
  userRef.current = user;
  const idCompte = user?.id ?? null;
  const verifierProfil = useCallback(async () => {
    const u = userRef.current;
    if (!u || isDemo) {
      setEtatProfil('ok');
      return;
    }
    setEtatProfil(await assurerProfil(u));
  }, [idCompte, isDemo]);
  useEffect(() => {
    setEtatProfil('verification');
    verifierProfil();
  }, [verifierProfil]);

  useEffect(() => {
    // Hide the native splash screen once our custom one is ready
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Nettoyage : annule les anciens « Conseil du matin » (données de démo) encore programmés.
    if (idCompte) {
      cancelConseilDuMatin().catch(() => {});
    }
  }, [idCompte]);

  // ─── Redirection : uniquement sur un CHANGEMENT de compte ou de rôle ───
  // (connexion, déconnexion, démo, mode enfant). Dépend de l'id du compte, jamais de l'objet user :
  // un rafraîchissement du jeton ne doit pas réinitialiser la navigation (formulaire en cours perdu).
  useEffect(() => {
    if (loading || etatProfil !== 'ok') return;

    const target =
      role === 'enseignant'
        ? 'EnseignantDashboard'
        : role === 'eleve'
          ? 'EleveSpace'
          : role === 'enfant-pin'
            ? 'Sandbox'
            : role === 'parent'
              ? 'MainPager'
              : 'Login';

    // If not authenticated, always keep auth stack entrypoint.
    const next = !role || !idCompte ? 'Login' : target;

    if (!navigationRef.isReady()) return;

    navigationRef.reset({
      index: 0,
      routes: [{ name: next as keyof RootStackParamList }],
    });
  }, [navigationRef, loading, role, idCompte, etatProfil]);

  if (loading || (user && !isDemo && etatProfil === 'verification')) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F2F1EE', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4338CA" />
      </View>
    );
  }

  if (user && !isDemo && etatProfil === 'incomplet') {
    return <ProfilIncompletScreen onReessayer={verifierProfil} onDeconnecter={() => signOut()} />;
  }

  return (
    <>
    {/* Appui sur une notification → l'élément exact, dans le carnet du bon enfant (B4a). */}
    <NotificationsRouteur />
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {/* ── Auth ── */}
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Connexion" component={ConnexionScreen} />
      <RootStack.Screen name="Inscription" component={InscriptionScreen} />
      <RootStack.Screen name="Pin" component={PinScreen as any} />

      {/* ── Main app ── */}
      <RootStack.Screen name="MainPager" component={TabNavigator} />
      <RootStack.Screen name="EnseignantDashboard" component={TeacherTabNavigator} />
      <RootStack.Screen name="EleveSpace" component={EleveTabNavigator} />
      <RootStack.Screen name="Sandbox" component={SandboxNavigator} />
    </RootStack.Navigator>
    </>
  );
}

/** Fond des cartes de navigation (visible en transition / derrière les écrans transparents). */
const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: SCREEN_BACKGROUND },
};

export default function App() {
  const fontsLoaded = useSolariaFonts();

  // ENV diagnostics are logged at import time by src/services/getEnv.ts

  if (!fontsLoaded) {
    return null; // Expo splash screen stays visible while fonts load
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <SchoolModeProvider>
            <ActiveChildProvider>
                <WallpaperProvider>
                <DemoProvider>
                  <NavigationContainer ref={navigationRef} theme={NAV_THEME}>
                    <StatusBar style="dark" />
                    <ErrorBoundary>
                      <AppContent navigationRef={navigationRef as NavigationContainerRef<RootStackParamList>} />
                    </ErrorBoundary>
                  </NavigationContainer>
                </DemoProvider>
                </WallpaperProvider>
            </ActiveChildProvider>
          </SchoolModeProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
