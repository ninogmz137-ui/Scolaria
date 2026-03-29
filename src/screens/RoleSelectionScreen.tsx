import { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import { Box, Text, Pressable, VStack, HStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import LogoScolariaSvg from '../components/LogoScolariaSvg';

const { width } = Dimensions.get('window');

export type UserRole = 'parent' | 'eleve' | 'enseignant';

interface RoleConfig {
  key: UserRole;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  gradient: [string, string];
  color: string;
  features: string[];
}

const ROLES: RoleConfig[] = [
  {
    key: 'parent',
    label: 'Parent',
    subtitle: 'Suivez la scolarité de vos enfants',
    icon: 'people',
    emoji: '👨‍👩‍👧‍👦',
    gradient: [Colors.violet, Colors.violetDark],
    color: Colors.violet,
    features: ['Profils enfants', 'Notes & bulletins', 'Score de Joie', 'Agenda'],
  },
  {
    key: 'eleve',
    label: 'Élève',
    subtitle: 'Accède à ton espace personnel',
    icon: 'school',
    emoji: '🎒',
    gradient: [Colors.cyan, Colors.cyanDark],
    color: Colors.cyan,
    features: ['Mon profil', 'Mes notes', 'Mon ressenti', 'Aria IA'],
  },
  {
    key: 'enseignant',
    label: 'Enseignant',
    subtitle: 'Gérez votre classe efficacement',
    icon: 'easel',
    emoji: '👩‍🏫',
    gradient: ['#FF8C42', '#E07030'],
    color: '#FF8C42',
    features: ['Appréciations', 'Météo de classe', 'Vie de classe', 'Tableau de bord'],
  },
];

interface Props {
  onSelectRole: (role: UserRole) => void;
}

export default function RoleSelectionScreen({ onSelectRole }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef(ROLES.map(() => new Animated.Value(50))).current;
  const scaleAnims = useRef(ROLES.map(() => new Animated.Value(0.9))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    ROLES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(slideAnims[i], {
          toValue: 0, duration: 500, delay: 200 + i * 120, useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[i], {
          toValue: 1, tension: 50, friction: 8, delay: 200 + i * 120, useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <Box className="flex-1 bg-blue-night">
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={[Colors.violet, Colors.blueNight]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 16 }}
        >
          <LogoScolariaSvg width={220} variant="dark" showSubtitle />
          <Text className="text-xl font-bold text-white mt-4">Qui êtes-vous ?</Text>
          <Text className="text-[13px] text-white/60 mt-1.5 text-center px-10">
            Choisissez votre rôle pour une expérience personnalisée
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Role cards */}
      <VStack className="flex-1 px-5 pt-2 gap-3.5 justify-center">
        {ROLES.map((role, i) => (
          <Animated.View
            key={role.key}
            style={{
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnims[i] },
                { scale: scaleAnims[i] },
              ],
            }}
          >
            <Pressable
              className="rounded-[20px] overflow-hidden shadow-lg"
              onPress={() => onSelectRole(role.key)}
            >
              <LinearGradient
                colors={role.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, position: 'relative' }}
              >
                {/* Left: icon + info */}
                <HStack className="items-center gap-3.5 mb-3">
                  <Box className="w-[52px] h-[52px] rounded-[26px] bg-white/20 justify-center items-center">
                    <Text className="text-[28px]">{role.emoji}</Text>
                  </Box>
                  <Box className="flex-1">
                    <Text className="text-[22px] font-black text-white">{role.label}</Text>
                    <Text className="text-[13px] text-white/80 mt-0.5">{role.subtitle}</Text>
                  </Box>
                </HStack>

                {/* Features */}
                <HStack className="flex-wrap gap-1.5">
                  {role.features.map((feat) => (
                    <Box key={feat} className="bg-white/20 px-2.5 py-1 rounded-[10px]">
                      <Text className="text-[11px] font-semibold text-white">{feat}</Text>
                    </Box>
                  ))}
                </HStack>

                {/* Arrow */}
                <Box className="absolute right-5 top-6 w-9 h-9 rounded-[18px] bg-white/15 justify-center items-center">
                  <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.9)" />
                </Box>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}
      </VStack>

      {/* Footer */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Box className="items-center py-5 px-10">
          <Text className="text-xs text-foreground-muted text-center">
            Vous pourrez changer de rôle à tout moment depuis les réglages
          </Text>
        </Box>
      </Animated.View>
    </Box>
  );
}
