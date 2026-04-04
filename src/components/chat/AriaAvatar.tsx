import { View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  size?: number;
}

/** Aria gradient avatar — violet→cyan circle with ✦ sparkle. Web fallback via CSS. */
export default function AriaAvatar({ size = 36 }: Props) {
  const half = size / 2;
  const sparkle = <Text style={{ color: '#FFFFFF', fontSize: Math.round(size * 0.4) }}>✦</Text>;

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          alignItems: 'center',
          justifyContent: 'center',
          // @ts-ignore — web-only CSS property
          backgroundImage: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
        }}
      >
        {sparkle}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#7C3AED', '#06B6D4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: half,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {sparkle}
    </LinearGradient>
  );
}
