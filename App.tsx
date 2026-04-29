import './src/global.css';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import {
  NavigationContainer,
  type NavigationContainerRef,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import EleveTabNavigator from './src/navigation/EleveTabNavigator';
import SandboxNavigator from './src/navigation/SandboxNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ConnexionScreen from './src/screens/ConnexionScreen';
import InscriptionScreen from './src/screens/InscriptionScreen';
import PinScreen from './src/screens/PinScreen';
/** Kept for future reuse (e.g. Aria) — auto-open on Accueil disabled below. */
// import ConseilDuMatin from './src/components/ConseilDuMatin';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { SchoolModeProvider } from './src/contexts/SchoolModeContext';
import { ActiveChildProvider } from './src/contexts/ActiveChildContext';
import { ChildThemeProvider } from './src/contexts/ChildThemeContext';
import { WallpaperProvider } from './src/contexts/WallpaperContext';
import { DemoProvider } from './src/contexts/DemoContext';
import { scheduleConseilDuMatin } from './src/services/notifications';
import { useSolariaFonts } from './src/hooks/useSolariaFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';

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
  const { user, loading, role } = useAuth();

  useEffect(() => {
    // Hide the native splash screen once our custom one is ready
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Schedule morning notifications when user logs in
    if (user) {
      scheduleConseilDuMatin().catch(() => {});
    }
  }, [user]);

  // ─── Redirect on auth state changes ────────────────────
  useEffect(() => {
    if (loading) return;

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
    const next = !role || !user ? 'Login' : target;

    if (!navigationRef.isReady()) return;

    navigationRef.reset({
      index: 0,
      routes: [{ name: next as keyof RootStackParamList }],
    });
  }, [navigationRef, loading, role, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F2F1EE', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4338CA" />
      </View>
    );
  }

  return (
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
  );
}

export default function App() {
  const fontsLoaded = useSolariaFonts();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

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
              <ChildThemeProvider>
                <WallpaperProvider>
                <DemoProvider>
                  <NavigationContainer ref={navigationRef}>
                    <StatusBar style="light" />
                    <ErrorBoundary>
                      <AppContent navigationRef={navigationRef} />
                    </ErrorBoundary>
                  </NavigationContainer>
                </DemoProvider>
                </WallpaperProvider>
              </ChildThemeProvider>
            </ActiveChildProvider>
          </SchoolModeProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
