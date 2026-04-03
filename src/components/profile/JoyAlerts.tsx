import { useEffect, useRef } from 'react';
import { Animated, Linking } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../hooks/useSolariaFonts';

// ─── Alert level types ───────────────────────────────────

export type AlertLevel = 'attention' | 'vigilance' | 'urgence' | null;

interface DayScore {
  day: number;
  score: number;
}

// ─── Detection logic ─────────────────────────────────────

/**
 * Analyse les 5 derniers jours glissants pour détecter une baisse.
 * - Attention : baisse de 15-29% par rapport à la moyenne précédente
 * - Vigilance : baisse de 30-49% par rapport à la moyenne précédente
 * - Urgence : baisse de 50%+ ou score moyen < 3 sur les 5 derniers jours
 */
export function detectJoyAlert(data: DayScore[]): {
  level: AlertLevel;
  dropPercent: number;
  recentAvg: number;
  previousAvg: number;
} {
  if (data.length < 10) {
    return { level: null, dropPercent: 0, recentAvg: 0, previousAvg: 0 };
  }

  const recent5 = data.slice(-5);
  const previous5 = data.slice(-10, -5);

  const recentAvg = recent5.reduce((s, d) => s + d.score, 0) / recent5.length;
  const previousAvg = previous5.reduce((s, d) => s + d.score, 0) / previous5.length;

  if (previousAvg === 0) {
    return { level: null, dropPercent: 0, recentAvg, previousAvg };
  }

  const dropPercent = ((previousAvg - recentAvg) / previousAvg) * 100;

  let level: AlertLevel = null;
  if (recentAvg < 3 || dropPercent >= 50) {
    level = 'urgence';
  } else if (dropPercent >= 30) {
    level = 'vigilance';
  } else if (dropPercent >= 15) {
    level = 'attention';
  }

  return { level, dropPercent: Math.round(dropPercent), recentAvg, previousAvg };
}

// ─── Critical keywords for urgency protocol ──────────────

const CRITICAL_KEYWORDS = [
  'mourir', 'mort', 'suicide', 'suicider', 'tuer',
  'automutilation', 'scarification', 'couper',
  'plus envie', 'finir', 'disparaître',
  'harcèlement', 'harcelé', 'harceler',
  'frapper', 'frappé', 'violence', 'violent',
  'peur', 'terreur', 'menace', 'menacé',
  'toucher', 'attoucher', 'abus', 'abusé',
  'personne m\'aime', 'tout seul', 'abandonné',
  'envie de rien', 'plus la force',
];

/**
 * Détecte des mots-clés critiques dans un message de check-in.
 */
export function detectCriticalKeywords(message: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CRITICAL_KEYWORDS.some((kw) => {
    const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(normalizedKw);
  });
}

// ─── Alert config ─────────────────────────────────────────

const ALERT_CONFIG = {
  attention: {
    icon: 'alert-circle' as const,
    title: 'Attention',
    color: Colors.orange,
    bgColor: '#FFF8E1',
    borderColor: '#FBBF2440',
    message: 'Le Score de Joie est en baisse ces derniers jours. Pensez à discuter avec votre enfant.',
    action: 'Ouvrir Mon Ressenti',
  },
  vigilance: {
    icon: 'warning' as const,
    title: 'Vigilance',
    color: '#F97316',
    bgColor: '#FFF3E0',
    borderColor: '#F9731640',
    message: 'Baisse significative du bien-être détectée sur 5 jours. Un échange avec l\'enfant est recommandé.',
    action: 'Parler avec Aria',
  },
  urgence: {
    icon: 'alert' as const,
    title: 'Urgence',
    color: Colors.red,
    bgColor: '#FFEBEE',
    borderColor: '#F8717140',
    message: 'Le bien-être de votre enfant nécessite une attention immédiate. N\'hésitez pas à contacter un professionnel.',
    action: null,
  },
};

// ─── Component ────────────────────────────────────────────

interface Props {
  level: AlertLevel;
  dropPercent: number;
  recentAvg: number;
  childName: string;
  showUrgencyProtocol?: boolean;
  onActionPress?: () => void;
}

export default function JoyAlerts({
  level,
  dropPercent,
  recentAvg,
  childName,
  showUrgencyProtocol = false,
  onActionPress,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const shouldShow = level !== null || showUrgencyProtocol;

  useEffect(() => {
    if (shouldShow) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse for urgence
      if (level === 'urgence' || showUrgencyProtocol) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.02,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      }
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  const effectiveLevel = showUrgencyProtocol ? 'urgence' : level!;
  const config = ALERT_CONFIG[effectiveLevel];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
      }}
    >
      {/* Alert banner */}
      <Box
        className="rounded-2xl p-4"
        style={{
          backgroundColor: config.bgColor,
        }}
      >
        {/* Header */}
        <HStack className="justify-between items-center mb-2.5">
          <HStack
            className="items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ backgroundColor: config.color + '25' }}
          >
            <Ionicons name={config.icon} size={16} color={config.color} />
            <Text
              className="text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: config.color }}
            >
              {config.title}
            </Text>
          </HStack>
          {dropPercent > 0 && (
            <Text className="text-lg font-black" style={{ color: config.color }}>
              -{dropPercent}%
            </Text>
          )}
        </HStack>

        {/* Message */}
        <Text className="text-sm mb-2.5" style={{ color: '#0F172A', lineHeight: 20 }}>
          {showUrgencyProtocol
            ? `Un message de ${childName} contient des mots préoccupants. Veuillez prêter attention à son état émotionnel.`
            : config.message}
        </Text>

        {/* Score info */}
        {!showUrgencyProtocol && (
          <Box className="px-3 py-2 rounded-xl mb-3" style={{ backgroundColor: '#F1F5F9' }}>
            <Text className="text-[13px]" style={{ color: '#64748B' }}>
              Score moyen sur 5 jours :{' '}
              <Text style={{ color: config.color, fontFamily: FontFamily.displayExtraBold }}>
                {recentAvg.toFixed(1)}/10
              </Text>
            </Text>
          </Box>
        )}

        {/* Action button (non-urgence) */}
        {config.action && !showUrgencyProtocol && (
          <Pressable
            className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
            style={{ backgroundColor: config.color + '20' }}
            onPress={onActionPress}
          >
            <Text className="text-sm font-bold" style={{ color: config.color }}>
              {config.action}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={config.color} />
          </Pressable>
        )}
      </Box>

      {/* Urgency protocol — help numbers */}
      {(effectiveLevel === 'urgence' || showUrgencyProtocol) && (
        <Box
          className="mt-3 rounded-2xl p-4"
          style={{
            backgroundColor: '#FFFFFF',
          }}
        >
          <HStack className="items-center gap-2 mb-3.5">
            <Ionicons name="shield-checkmark" size={18} color={Colors.red} />
            <Text className="text-base font-extrabold" style={{ color: '#0F172A' }}>
              Numéros d'aide
            </Text>
          </HStack>

          {/* 3020 — Harcèlement */}
          <Pressable
            className="flex-row items-center justify-between rounded-xl p-3.5 mb-2"
            style={{ backgroundColor: '#F1F5F9' }}
            onPress={() => Linking.openURL('tel:3020')}
          >
            <HStack className="items-center gap-3 flex-1">
              <Box
                className="justify-center items-center"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F97316' + '20' }}
              >
                <Text className="text-xl">📞</Text>
              </Box>
              <Box>
                <Text className="text-xl font-black" style={{ color: '#0F172A' }}>3020</Text>
                <Text className="text-[11px] mt-0.5" style={{ color: '#94A3B8', maxWidth: 200 }}>
                  Non au Harcèlement — gratuit et anonyme
                </Text>
              </Box>
            </HStack>
            <Box
              className="justify-center items-center"
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F97316' }}
            >
              <Ionicons name="call" size={14} color={Colors.white} />
            </Box>
          </Pressable>

          {/* 3114 — Prévention du suicide */}
          <Pressable
            className="flex-row items-center justify-between rounded-xl p-3.5 mb-2"
            style={{ backgroundColor: '#F1F5F9' }}
            onPress={() => Linking.openURL('tel:3114')}
          >
            <HStack className="items-center gap-3 flex-1">
              <Box
                className="justify-center items-center"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.red + '20' }}
              >
                <Text className="text-xl">🆘</Text>
              </Box>
              <Box>
                <Text className="text-xl font-black" style={{ color: '#0F172A' }}>3114</Text>
                <Text className="text-[11px] mt-0.5" style={{ color: '#94A3B8', maxWidth: 200 }}>
                  Prévention du suicide — 24h/24, 7j/7
                </Text>
              </Box>
            </HStack>
            <Box
              className="justify-center items-center"
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.red }}
            >
              <Ionicons name="call" size={14} color={Colors.white} />
            </Box>
          </Pressable>

          {/* 119 — Enfance en danger */}
          <Pressable
            className="flex-row items-center justify-between rounded-xl p-3.5 mb-2"
            style={{ backgroundColor: '#F1F5F9' }}
            onPress={() => Linking.openURL('tel:119')}
          >
            <HStack className="items-center gap-3 flex-1">
              <Box
                className="justify-center items-center"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.violet + '20' }}
              >
                <Text className="text-xl">🛡️</Text>
              </Box>
              <Box>
                <Text className="text-xl font-black" style={{ color: '#0F172A' }}>119</Text>
                <Text className="text-[11px] mt-0.5" style={{ color: '#94A3B8', maxWidth: 200 }}>
                  Allô Enfance en Danger — gratuit, 24h/24
                </Text>
              </Box>
            </HStack>
            <Box
              className="justify-center items-center"
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.violet }}
            >
              <Ionicons name="call" size={14} color={Colors.white} />
            </Box>
          </Pressable>

          <Text className="text-[11px] text-center mt-2" style={{ color: '#94A3B8', lineHeight: 16 }}>
            Ces numéros sont gratuits, confidentiels et disponibles
            pour les enfants comme pour les parents.
          </Text>
        </Box>
      )}
    </Animated.View>
  );
}
