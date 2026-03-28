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
import AuthScreen from './src/screens/AuthScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
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
import type { UserRole } from './src/contexts/AuthContext';

const ONBOARDING_KEY = '@scolaria_onboarding_done';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading, role, setRole } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showConseil, setShowConseil] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

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

  // Role selection (before auth form)
  if (!role) {
    return <RoleSelectionScreen onSelectRole={(r) => setRole(r)} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Route to correct navigator based on role
  const renderNavigator = () => {
    switch (role) {
      case 'enseignant':
        return <TeacherTabNavigator />;
      case 'eleve':
        return <EleveTabNavigator />;
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

  if (!fontsLoaded) {
    return null; // Expo splash screen stays visible while fonts load
  }

  return (
    <I18nProvider>
      <SchoolModeProvider>
        <ActiveChildProvider>
          <ChildThemeProvider>
            <AuthProvider>
              <NavigationContainer>
                <StatusBar style="light" />
                <AppContent />
              </NavigationContainer>
            </AuthProvider>
          </ChildThemeProvider>
        </ActiveChildProvider>
      </SchoolModeProvider>
    </I18nProvider>
  );
}
