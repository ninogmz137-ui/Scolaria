import './src/global.css';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import EleveTabNavigator from './src/navigation/EleveTabNavigator';
import SandboxNavigator from './src/navigation/SandboxNavigator';
import LoginScreen from './src/screens/LoginScreen';
import PinScreen from './src/screens/PinScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SplashScreenAnimated from './src/screens/SplashScreen';
import ConseilDuMatin from './src/components/ConseilDuMatin';
import DemoBanner from './src/components/DemoBanner';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { SchoolModeProvider } from './src/contexts/SchoolModeContext';
import { ActiveChildProvider } from './src/contexts/ActiveChildContext';
import { ChildThemeProvider } from './src/contexts/ChildThemeContext';
import { Colors } from './src/constants/colors';
import { scheduleConseilDuMatin } from './src/services/notifications';
import { useSolariaFonts } from './src/hooks/useSolariaFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const ONBOARDING_KEY = '@scolaria_onboarding_done';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading, role } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showConseil, setShowConseil] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'pin'>('login');

  useEffect(() => {
    // Hide the native splash screen once our custom one is ready
    ExpoSplashScreen.hideAsync().catch(() => {});

    // Check if onboarding has been completed
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setShowOnboarding(value !== 'true');
    });
  }, []);

  useEffect(() => {
    // Schedule morning notifications when user logs in
    if (user) {
      scheduleConseilDuMatin().catch(() => {});
    }
  }, [user]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
    // Show morning tip after splash, only if user is logged in and onboarding is done
    if (user && showOnboarding === false) {
      setTimeout(() => setShowConseil(true), 500);
    }
  };

  if (loading || showSplash || showOnboarding === null) {
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

  // Show onboarding for new users (before auth)
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
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
    <>
      <DemoBanner />
      {renderNavigator()}
      {role === 'parent' && (
        <ConseilDuMatin
          visible={showConseil}
          onDismiss={() => setShowConseil(false)}
        />
      )}
    </>
  );
}

export default function App() {
  const fontsLoaded = useSolariaFonts();

  // ─── Startup env diagnostics (visible in adb logcat / Expo logs) ──
  useEffect(() => {
    const keys = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_ANTHROPIC_API_KEY'];
    keys.forEach((k) => {
      const v = process.env[k];
      console.log(`[ENV] ${k}: ${v ? `✓ (${v.substring(0, 15)}...)` : '✗ MISSING'}`);
    });
  }, []);

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
                <NavigationContainer>
                  <StatusBar style="light" />
                  <AppContent />
                </NavigationContainer>
              </ChildThemeProvider>
            </ActiveChildProvider>
          </SchoolModeProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
