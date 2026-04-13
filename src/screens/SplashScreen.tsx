/**
 * SplashScreen — Épure lumineuse v3.
 *
 * Fond clair #FAFAF8, cohérent avec LoginScreen.
 * Wordmark inline SVG : "Scolar" navy + "ia" dégradé violet→cyan + ✦.
 * Halos violet/cyan très subtils adaptés au fond clair.
 * Dot pulsant violet discret en bas.
 * Transition seamless vers LoginScreen.
 */

import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';

const NAVY   = '#1A2340';
const VIOLET = '#7C3AED';
const CYAN   = '#06B6D4';

function Wordmark() {
  const vbW = 280; const vbH = 64;
  const h = 52;
  const w = (vbW / vbH) * h;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${vbW} ${vbH}`}>
      <Defs>
        <SvgGrad id="splIaG" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={VIOLET} />
          <Stop offset="1" stopColor={CYAN} />
        </SvgGrad>
        <SvgGrad id="splSpkG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={VIOLET} />
          <Stop offset="1" stopColor={CYAN} />
        </SvgGrad>
      </Defs>
      <SvgText
        x="140" y="50"
        textAnchor="middle"
        fontFamily="DMSerifDisplay_400Regular"
        fontSize="52"
        letterSpacing="-0.5"
        fill={NAVY}
      >
        {'Scolar'}<TSpan fill="url(#splIaG)">{'ia'}</TSpan>
      </SvgText>
      <SvgText x="191" y="22" fontSize="15" fill="url(#splSpkG)">{'✦'}</SvgText>
    </Svg>
  );
}

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const [fontsLoaded] = useFonts({ DMSerifDisplay_400Regular });
  const logoOpacity    = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(8)).current;
  const dotOpacity     = useRef(new Animated.Value(0)).current;
  const dotScale       = useRef(new Animated.Value(0.8)).current;
  const screenFadeOut  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity,    { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(logoTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(dotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
          Animated.timing(dotScale, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }, 400);

    const timer = setTimeout(() => {
      Animated.timing(screenFadeOut, { toValue: 0, duration: 380, useNativeDriver: true })
        .start(() => onFinish());
    }, 1800);

    const fallback = setTimeout(() => onFinish(), 4200);
    return () => { clearTimeout(timer); clearTimeout(fallback); };
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: screenFadeOut }]}>
      {/* Fond clair — même teinte que LoginScreen */}
      <View style={[StyleSheet.absoluteFill, s.bg]} />

      {/* Halos très discrets adaptés fond clair */}
      <View style={s.haloViolet} />
      <View style={s.haloCyan} />

      {/* Wordmark inline : Scolar navy + ia gradient + ✦ */}
      <Animated.View
        style={[s.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}
      >
        {fontsLoaded ? <Wordmark /> : <View style={{ height: 52 }} />}
      </Animated.View>

      {/* Dot pulsant violet */}
      <Animated.View
        style={[s.dotWrap, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]}
      >
        <View style={s.dot} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bg: {
    backgroundColor: '#FAFAF8',
  },

  haloViolet: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(124,58,237,0.05)',
    top: -110,
    right: -110,
  },
  haloCyan: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6,182,212,0.04)',
    bottom: 60,
    left: -90,
  },

  logoWrap: { alignItems: 'center' },

  dotWrap: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(124,58,237,0.45)',
  },
});
