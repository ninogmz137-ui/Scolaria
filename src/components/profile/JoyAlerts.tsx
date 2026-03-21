import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

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
    bgColor: '#3D2E10',
    borderColor: '#FBBF2440',
    message: 'Le Score de Joie est en baisse ces derniers jours. Pensez à discuter avec votre enfant.',
    action: 'Ouvrir Mon Ressenti',
  },
  vigilance: {
    icon: 'warning' as const,
    title: 'Vigilance',
    color: '#F97316',
    bgColor: '#3D1E10',
    borderColor: '#F9731640',
    message: 'Baisse significative du bien-être détectée sur 5 jours. Un échange avec l\'enfant est recommandé.',
    action: 'Parler avec Aria',
  },
  urgence: {
    icon: 'alert' as const,
    title: 'Urgence',
    color: Colors.red,
    bgColor: '#3D1010',
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
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      {/* Alert banner */}
      <View
        style={[
          styles.alertCard,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.alertHeader}>
          <View style={[styles.levelBadge, { backgroundColor: config.color + '25' }]}>
            <Ionicons name={config.icon} size={16} color={config.color} />
            <Text style={[styles.levelText, { color: config.color }]}>
              {config.title}
            </Text>
          </View>
          {dropPercent > 0 && (
            <Text style={[styles.dropText, { color: config.color }]}>
              -{dropPercent}%
            </Text>
          )}
        </View>

        {/* Message */}
        <Text style={styles.alertMessage}>
          {showUrgencyProtocol
            ? `Un message de ${childName} contient des mots préoccupants. Veuillez prêter attention à son état émotionnel.`
            : config.message}
        </Text>

        {/* Score info */}
        {!showUrgencyProtocol && (
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreInfoText}>
              Score moyen sur 5 jours :{' '}
              <Text style={{ color: config.color, fontWeight: '800' }}>
                {recentAvg.toFixed(1)}/10
              </Text>
            </Text>
          </View>
        )}

        {/* Action button (non-urgence) */}
        {config.action && !showUrgencyProtocol && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: config.color + '20' }]}
            onPress={onActionPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: config.color }]}>
              {config.action}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={config.color} />
          </TouchableOpacity>
        )}
      </View>

      {/* Urgency protocol — help numbers */}
      {(effectiveLevel === 'urgence' || showUrgencyProtocol) && (
        <View style={styles.urgencyProtocol}>
          <View style={styles.urgencyHeader}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.red} />
            <Text style={styles.urgencyTitle}>Numéros d'aide</Text>
          </View>

          {/* 3020 — Harcèlement */}
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:3020')}
            activeOpacity={0.7}
          >
            <View style={styles.helpLineLeft}>
              <View style={[styles.helpIcon, { backgroundColor: '#F97316' + '20' }]}>
                <Text style={styles.helpEmoji}>📞</Text>
              </View>
              <View>
                <Text style={styles.helpNumber}>3020</Text>
                <Text style={styles.helpLabel}>
                  Non au Harcèlement — gratuit et anonyme
                </Text>
              </View>
            </View>
            <View style={styles.callBadge}>
              <Ionicons name="call" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* 3114 — Prévention du suicide */}
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:3114')}
            activeOpacity={0.7}
          >
            <View style={styles.helpLineLeft}>
              <View style={[styles.helpIcon, { backgroundColor: Colors.red + '20' }]}>
                <Text style={styles.helpEmoji}>🆘</Text>
              </View>
              <View>
                <Text style={styles.helpNumber}>3114</Text>
                <Text style={styles.helpLabel}>
                  Prévention du suicide — 24h/24, 7j/7
                </Text>
              </View>
            </View>
            <View style={[styles.callBadge, { backgroundColor: Colors.red }]}>
              <Ionicons name="call" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* 119 — Enfance en danger */}
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:119')}
            activeOpacity={0.7}
          >
            <View style={styles.helpLineLeft}>
              <View style={[styles.helpIcon, { backgroundColor: Colors.violet + '20' }]}>
                <Text style={styles.helpEmoji}>🛡️</Text>
              </View>
              <View>
                <Text style={styles.helpNumber}>119</Text>
                <Text style={styles.helpLabel}>
                  Allô Enfance en Danger — gratuit, 24h/24
                </Text>
              </View>
            </View>
            <View style={[styles.callBadge, { backgroundColor: Colors.violet }]}>
              <Ionicons name="call" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.urgencyFooter}>
            Ces numéros sont gratuits, confidentiels et disponibles
            pour les enfants comme pour les parents.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  alertCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropText: {
    fontSize: 18,
    fontWeight: '900',
  },
  alertMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 10,
  },
  scoreInfo: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  scoreInfoText: {
    fontSize: 13,
    color: Colors.gray,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Urgency protocol
  urgencyProtocol: {
    marginTop: 12,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.red + '30',
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  urgencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  helpLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.blueNightLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  helpLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpEmoji: {
    fontSize: 20,
  },
  helpNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  helpLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
    maxWidth: 200,
  },
  callBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgencyFooter: {
    fontSize: 11,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
