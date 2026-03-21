/**
 * Onboarding — 3 slides de présentation pour les nouveaux utilisateurs.
 *
 * Slide 1: Bienvenue dans Scolaria
 * Slide 2: Aria, votre assistante IA
 * Slide 3: Suivi complet de la scolarité
 */

import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

// ─── Slide data ──────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  highlight: string;
  description: string;
  features: { icon: keyof typeof Ionicons.glyphMap; label: string }[];
  gradient: [string, string];
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🎓',
    title: 'Bienvenue dans',
    highlight: 'Scolaria',
    description:
      'Le passeport scolaire numérique qui accompagne vos enfants tout au long de leur scolarité.',
    features: [
      { icon: 'shield-checkmark', label: 'Données sécurisées (RGPD)' },
      { icon: 'people', label: 'Multi-enfants' },
      { icon: 'phone-portrait', label: 'Tout sur mobile' },
    ],
    gradient: [Colors.violet, Colors.blueNight],
    accentColor: Colors.cyan,
  },
  {
    id: '2',
    emoji: '✦',
    title: 'Rencontrez',
    highlight: 'Aria',
    description:
      'Votre assistante IA personnelle analyse les résultats, détecte les tendances et vous donne des conseils adaptés chaque jour.',
    features: [
      { icon: 'sparkles', label: 'Conseils personnalisés' },
      { icon: 'trending-up', label: 'Analyse des tendances' },
      { icon: 'chatbubbles', label: 'Chat intelligent' },
    ],
    gradient: [Colors.cyanDark, Colors.blueNight],
    accentColor: Colors.violet,
  },
  {
    id: '3',
    emoji: '📊',
    title: 'Suivi complet',
    highlight: 'en un coup d\'œil',
    description:
      'Notes, agenda, bien-être, scanner de bulletins... Tout ce dont vous avez besoin pour suivre la scolarité de vos enfants.',
    features: [
      { icon: 'school', label: 'Notes & moyennes' },
      { icon: 'calendar', label: 'Agenda intelligent' },
      { icon: 'heart', label: 'Score de bien-être' },
      { icon: 'scan', label: 'Scanner OCR de bulletins' },
    ],
    gradient: [Colors.violetDark, Colors.blueNight],
    accentColor: Colors.green,
  },
];

// ─── Props ───────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

// ─── Component ──────────────────────────────────────────

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      // Bounce animation on button press
      Animated.sequence([
        Animated.spring(buttonScale, {
          toValue: 0.92,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start(() => onComplete());
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  // ─── Render slide ─────────────────────────────────────

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.slideGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1, { borderColor: item.accentColor + '20' }]} />
        <View style={[styles.decorCircle, styles.decorCircle2, { borderColor: item.accentColor + '15' }]} />

        {/* Emoji hero */}
        <View style={styles.emojiContainer}>
          <View style={[styles.emojiGlow, { backgroundColor: item.accentColor + '15' }]} />
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        {/* Title */}
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={[styles.slideHighlight, { color: item.accentColor }]}>
          {item.highlight}
        </Text>

        {/* Description */}
        <Text style={styles.slideDescription}>{item.description}</Text>

        {/* Feature list */}
        <View style={styles.featuresContainer}>
          {item.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIconCircle, { backgroundColor: item.accentColor + '18' }]}>
                <Ionicons name={feature.icon} size={18} color={item.accentColor} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );

  // ─── Render dots ──────────────────────────────────────

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 28, 8],
          extrapolate: 'clamp',
        });

        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        const dotColor = scrollX.interpolate({
          inputRange,
          outputRange: [Colors.gray, Colors.cyan, Colors.gray],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor: dotColor,
              },
            ]}
          />
        );
      })}
    </View>
  );

  // ─── Main render ──────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottom}>
        {renderDots()}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextGradient}
            >
              {isLastSlide ? (
                <>
                  <Text style={styles.nextText}>Commencer</Text>
                  <Ionicons name="rocket" size={20} color={Colors.white} />
                </>
              ) : (
                <>
                  <Text style={styles.nextText}>Suivant</Text>
                  <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Page counter */}
        <Text style={styles.pageCounter}>
          {currentIndex + 1} / {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Skip
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
  },
  // Slide
  slide: {
    width,
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
    paddingBottom: 160,
  },
  // Decorative
  decorCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: 40,
    right: -80,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -60,
  },
  // Emoji
  emojiContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emojiGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emoji: {
    fontSize: 56,
  },
  // Text
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  slideHighlight: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  slideDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  // Features
  featuresContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  // Bottom
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: Colors.blueNight,
  },
  // Dots
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  // Next button
  nextButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 14,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
  },
  // Counter
  pageCounter: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '600',
  },
});
