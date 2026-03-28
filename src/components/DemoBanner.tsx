/**
 * DemoBanner — Shows a discreet banner when the app is in demo mode.
 *
 * Displayed at the top of the screen to signal that data is fictive.
 * Can be dismissed by the user for the current session.
 */

import { useState } from 'react';
import { Animated } from 'react-native';
import { HStack, Text, Pressable } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

export default function DemoBanner() {
  const { isDemo } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const opacity = useState(new Animated.Value(1))[0];

  if (!isDemo || dismissed) return null;

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDismissed(true));
  };

  return (
    <Animated.View
      style={{
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(251,191,36,0.1)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(251,191,36,0.15)',
      }}
    >
      <Ionicons name="flask" size={16} color={Colors.orange} />
      <Text
        className="flex-1 text-xs font-semibold text-center"
        style={{ color: Colors.orange }}
      >
        Mode démo — Données fictives
      </Text>
      <Pressable
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={Colors.gray} />
      </Pressable>
    </Animated.View>
  );
}
