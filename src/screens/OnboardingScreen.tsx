/**
 * Onboarding — 3 slides de presentation pour les nouveaux utilisateurs.
 *
 * Slide 1: Bienvenue dans Scolaria
 * Slide 2: Aria, votre assistante IA
 * Slide 3: Suivi complet de la scolarite
 */

import { useState, useRef } from 'react';
import { Dimensions, FlatList, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Box, Text, Pressable, HStack } from '../components/ui';
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
      'Le passeport scolaire numerique qui accompagne vos enfants tout au long de leur scolarite.',
    features: [
      { icon: 'shield-checkmark', label: 'Donnees securisees (RGPD)' },
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
      'Votre assistante IA personnelle analyse les resultats, detecte les tendances et vous donne des conseils adaptes chaque jour.',
    features: [
      { icon: 'sparkles', label: 'Conseils personnalises' },
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
    highlight: 'en un coup d\'oeil',
    description:
      'Notes, agenda, bien-etre, scanner de bulletins... Tout ce dont vous avez besoin pour suivre la scolarite de vos enfants.',
    features: [
      { icon: 'school', label: 'Notes & moyennes' },
      { icon: 'calendar', label: 'Agenda intelligent' },
      { icon: 'heart', label: 'Score de bien-etre' },
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
    <Box style={{ width, flex: 1 }}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingTop: 80, paddingBottom: 160 }}
      >
        {/* Decorative circles */}
        <Box
          className="absolute rounded-full"
          style={{ width: 300, height: 300, top: 40, right: -80, borderWidth: 1, borderColor: item.accentColor + '20' }}
        />
        <Box
          className="absolute rounded-full"
          style={{ width: 200, height: 200, bottom: 200, left: -60, borderWidth: 1, borderColor: item.accentColor + '15' }}
        />

        {/* Emoji hero */}
        <Box className="w-[100px] h-[100px] justify-center items-center mb-7">
          <Box
            className="absolute w-[100px] h-[100px] rounded-full"
            style={{ backgroundColor: item.accentColor + '15' }}
          />
          <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
        </Box>

        {/* Title */}
        <Text
          className="text-[28px] font-bold text-center"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          {item.title}
        </Text>
        <Text
          className="text-[34px] font-black text-center mb-[18px]"
          style={{ color: item.accentColor }}
        >
          {item.highlight}
        </Text>

        {/* Description */}
        <Text
          className="text-base text-center leading-6 mb-8"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          {item.description}
        </Text>

        {/* Feature list */}
        <Box className="self-stretch" style={{ gap: 12 }}>
          {item.features.map((feature, i) => (
            <HStack
              key={i}
              className="items-center py-3 px-[18px] rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', gap: 14 }}
            >
              <Box
                className="w-9 h-9 rounded-full justify-center items-center"
                style={{ backgroundColor: item.accentColor + '18' }}
              >
                <Ionicons name={feature.icon} size={18} color={item.accentColor} />
              </Box>
              <Text className="text-[15px] font-semibold" style={{ color: Colors.white }}>
                {feature.label}
              </Text>
            </HStack>
          ))}
        </Box>
      </LinearGradient>
    </Box>
  );

  // ─── Render dots ──────────────────────────────────────

  const renderDots = () => (
    <HStack className="items-center mb-6" style={{ gap: 8 }}>
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
            style={{
              height: 8,
              borderRadius: 4,
              width: dotWidth,
              opacity: dotOpacity,
              backgroundColor: dotColor,
            }}
          />
        );
      })}
    </HStack>
  );

  // ─── Main render ──────────────────────────────────────

  return (
    <Box className="flex-1" style={{ backgroundColor: Colors.blueNight }}>
      {/* Skip button */}
      {!isLastSlide && (
        <Pressable
          className="absolute top-14 right-6 z-10 px-4 py-2 rounded-[20px]"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm font-semibold" style={{ color: Colors.gray }}>Passer</Text>
        </Pressable>
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
      <Box
        className="absolute bottom-0 left-0 right-0 items-center pb-[50px] pt-5"
        style={{ backgroundColor: Colors.blueNight }}
      >
        {renderDots()}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            className="rounded-[30px] overflow-hidden mb-3.5"
            onPress={handleNext}
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 48 }}
            >
              {isLastSlide ? (
                <>
                  <Text className="text-[17px] font-extrabold" style={{ color: Colors.white }}>Commencer</Text>
                  <Ionicons name="rocket" size={20} color={Colors.white} />
                </>
              ) : (
                <>
                  <Text className="text-[17px] font-extrabold" style={{ color: Colors.white }}>Suivant</Text>
                  <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Page counter */}
        <Text className="text-xs font-semibold" style={{ color: Colors.gray }}>
          {currentIndex + 1} / {SLIDES.length}
        </Text>
      </Box>
    </Box>
  );
}
