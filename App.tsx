import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SplashScreenAnimated from './src/screens/SplashScreen';
import ConseilDuMatin from './src/components/ConseilDuMatin';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Colors } from './src/constants/colors';
import { scheduleConseilDuMatin } from './src/services/notifications';

const ONBOARDING_KEY = '@scolaria_onboarding_done';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading } = useAuth();
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
          <View style={styles.loading}>
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

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <TabNavigator />
      <ConseilDuMatin
        visible={showConseil}
        onDismiss={() => setShowConseil(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.blueNight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
