import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import TabNavigator from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import SplashScreenAnimated from './src/screens/SplashScreen';
import ConseilDuMatin from './src/components/ConseilDuMatin';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Colors } from './src/constants/colors';

// Prevent native splash from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showConseil, setShowConseil] = useState(false);

  useEffect(() => {
    // Hide the native splash screen once our custom one is ready
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    // Show morning tip after splash, only if user is logged in
    if (user) {
      setTimeout(() => setShowConseil(true), 500);
    }
  };

  if (loading || showSplash) {
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
