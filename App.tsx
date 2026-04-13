import './src/global.css';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import EleveTabNavigator from './src/navigation/EleveTabNavigator';
import SandboxNavigator from './src/navigation/SandboxNavigator';
import LoginScreen from './src/screens/LoginScreen';
import PinScreen from './src/screens/PinScreen';
import SplashScreenAnimated from './src/screens/SplashScreen';
/** Kept for future reuse (e.g. Aria) — auto-open on Accueil disabled below. */
// import ConseilDuMatin from './src/components/ConseilDuMatin';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { SchoolModeProvider } from './src/contexts/SchoolModeContext';
import { ActiveChildProvider } from './src/contexts/ActiveChildContext';
import { ChildThemeProvider } from './src/contexts/ChildThemeContext';
import { WallpaperProvider } from './src/contexts/WallpaperContext';
import { DemoProvider } from './src/contexts/DemoContext';
import { Colors } from './src/constants/colors';
import { scheduleConseilDuMatin } from './src/services/notifications';
import { useSolariaFonts } from './src/hooks/useSolariaFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading, role } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'pin'>('login');

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

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (loading || showSplash) {
    return (
      <>
        {loading && (
          <View className="flex-1 bg-blue-night justify-center items-center">
            <ActivityIndicator size="large" color={Colors.cyan} />
          </View>
        )}
        <SplashScreenAnimated onFinish={handleSplashFinish} />
      </>
    );
  }

  // ─── AUTH SCREENS ─────────────────────────────────────
  // No role yet = not authenticated → show login or PIN
  if (!role || !user) {
    if (authScreen === 'pin') {
      return <PinScreen onBack={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onNavigatePin={() => setAuthScreen('pin')} />;
  }

  // ─── AUTHENTICATED — Route to correct navigator ──────
  const renderNavigator = () => {
    switch (role) {
      case 'enseignant':
        return <TeacherTabNavigator />;
      case 'eleve':
        return <EleveTabNavigator />;
      case 'enfant-pin':
        return <SandboxNavigator />;
      case 'parent':
      default:
        return <TabNavigator />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderNavigator()}
      {/* Conseil du Matin — désactivé sur l’accueil ; réactiver via <ConseilDuMatin visible /> depuis Aria si besoin */}
    </View>
  );
}

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
              <ChildThemeProvider>
                <WallpaperProvider>
                <DemoProvider>
                  <NavigationContainer>
                    <StatusBar style="light" />
                    <ErrorBoundary>
                      <AppContent />
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
