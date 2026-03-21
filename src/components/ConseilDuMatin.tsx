/**
 * Conseil du Matin — Morning tip modal shown on app launch.
 *
 * Displays a contextual daily tip about the child's
 * school life, upcoming events, or well-being insights.
 */

import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
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
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [
                { translateY: slideUp },
                { scale: cardScale },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.blueNightCard, Colors.blueNight]}
            style={styles.card}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.sunEmoji}>☀️</Text>
                <View>
                  <Text style={styles.headerTitle}>Conseil du Matin</Text>
                  <Text style={styles.headerDate}>{today}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Tip content */}
            <View style={styles.tipContent}>
              <View style={styles.tipEmojiCircle}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              </View>

              <View style={[styles.categoryBadge, { backgroundColor: tip.color + '18' }]}>
                <Text style={[styles.categoryText, { color: tip.color }]}>
                  {tip.category}
                </Text>
              </View>

              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.violet, Colors.violetDark]}
                  style={styles.primaryGradient}
                >
                  <Text style={styles.primaryText}>Compris !</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>
                  Demander à Aria →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Aria analyse les données de Lucas chaque matin ✦
            </Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sunEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  headerDate: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
  },
  // Tip
  tipContent: {
    padding: 20,
    alignItems: 'center',
  },
  tipEmojiCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(109,40,217,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  tipEmoji: {
    fontSize: 32,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  tipBody: {
    fontSize: 15,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 23,
  },
  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  primaryGradient: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cyan,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.gray,
    paddingVertical: 14,
  },
});
