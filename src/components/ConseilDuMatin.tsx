/**
 * Conseil du Matin — Morning tip modal shown on app launch.
 *
 * Displays a contextual daily tip about the child's
 * school life, upcoming events, or well-being insights.
 */

import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from './ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

// ─── Daily tips pool ────────────────────────────────────

const TIPS = [
  {
    emoji: '📐',
    title: 'Contrôle de maths vendredi',
    body: 'Lucas a un contrôle sur les fractions et la proportionnalité. Pensez à réviser 30 min ce soir — les exercices p.142 sont parfaits pour ça !',
    category: 'Agenda',
    color: Colors.cyan,
  },
  {
    emoji: '🌟',
    title: 'Super résultat en anglais !',
    body: 'Lucas a obtenu 18/20 à son dernier oral d\'anglais. Sa moyenne en anglais (17/20) est la plus haute de toutes ses matières. Félicitez-le !',
    category: 'Notes',
    color: Colors.green,
  },
  {
    emoji: '😊',
    title: 'Score de Joie stable',
    body: 'Le bien-être de Lucas est au beau fixe cette semaine (7.6/10 en moyenne). Son stress reste bas et son énergie est bonne. Continuez ainsi !',
    category: 'Bien-être',
    color: Colors.warmOrange,
  },
  {
    emoji: '📈',
    title: 'Progression en histoire',
    body: 'Les notes de Lucas en Histoire-Géo sont en hausse : 18/20 au dernier exposé ! Il pourrait viser les félicitations ce trimestre.',
    category: 'Tendance',
    color: Colors.violet,
  },
  {
    emoji: '🔬',
    title: 'Sciences : un petit coup de pouce ?',
    body: 'La moyenne de Lucas en sciences (13/20) est en légère baisse. Un exercice pratique ou une vidéo éducative ce week-end pourrait relancer sa motivation.',
    category: 'Conseil',
    color: Colors.pink,
  },
  {
    emoji: '🥋',
    title: 'N\'oubliez pas le judo !',
    body: 'Lucas a entraînement de judo mercredi à 14h au dojo municipal. Le sport aide à la concentration — c\'est un vrai atout pour les études.',
    category: 'Activité',
    color: Colors.warmOrange,
  },
];

function getTodayTip() {
  // Pick a tip based on the day of year for variety
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return TIPS[dayOfYear % TIPS.length];
}

// ─── Component ────────────────────────────────────────────

export default function ConseilDuMatin({ visible, onDismiss }: Props) {
  const slideUp = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  const tip = getTodayTip();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', opacity: bgOpacity }}>
        <Pressable className="flex-1" onPress={handleDismiss} />

        <Animated.View
          style={{
            marginHorizontal: 16,
            marginBottom: 32,
            transform: [
              { translateY: slideUp },
              { scale: cardScale },
            ],
          }}
        >
          <Box
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: Colors.cardBorder,
              overflow: 'hidden',
              backgroundColor: Colors.card,
            }}
          >
            {/* Header */}
            <HStack className="justify-between items-center p-5 pb-3.5">
              <HStack className="items-center gap-3">
                <Text className="text-[28px]">☀️</Text>
                <Box>
                  <Text className="text-lg font-extrabold" style={{ color: Colors.textPrimary }}>
                    Conseil du Matin
                  </Text>
                  <Text className="text-[13px] mt-0.5 capitalize" style={{ color: Colors.textSecondary }}>
                    {today}
                  </Text>
                </Box>
              </HStack>
              <Pressable
                className="justify-center items-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#EEF0F5',
                }}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </HStack>

            {/* Divider */}
            <Box className="mx-5" style={{ height: 1, backgroundColor: Colors.cardBorder }} />

            {/* Tip content */}
            <VStack className="p-5 items-center">
              <Box
                className="justify-center items-center mb-3.5"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                }}
              >
                <Text className="text-[32px]">{tip.emoji}</Text>
              </Box>

              <Box
                className="px-3 py-1 rounded-xl mb-3"
                style={{ backgroundColor: tip.color + '18' }}
              >
                <Text className="text-xs font-bold" style={{ color: tip.color }}>
                  {tip.category}
                </Text>
              </Box>

              <Text className="text-xl font-extrabold text-center mb-2.5" style={{ color: Colors.textPrimary }}>
                {tip.title}
              </Text>
              <Text className="text-[15px] text-center" style={{ color: Colors.textSecondary, lineHeight: 23 }}>
                {tip.body}
              </Text>
            </VStack>

            {/* Actions */}
            <VStack className="px-5 gap-2.5">
              <Pressable className="rounded-3xl overflow-hidden" onPress={handleDismiss}>
                <LinearGradient
                  colors={['#6366F1', '#22D3EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ alignItems: 'center', paddingVertical: 14 }}
                >
                  <Text className="text-base font-extrabold" style={{ color: Colors.white }}>
                    Compris !
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable className="items-center py-2.5" onPress={handleDismiss}>
                <Text className="text-sm font-semibold" style={{ color: Colors.violet }}>
                  Demander à Aria →
                </Text>
              </Pressable>
            </VStack>

            {/* Footer */}
            <Text className="text-[11px] text-center py-3.5" style={{ color: Colors.textMuted }}>
              Aria analyse les données de Lucas chaque matin ✦
            </Text>
          </Box>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
