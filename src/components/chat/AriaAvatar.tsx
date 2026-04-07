import { View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from '@getpapillon/papicons';

interface Props {
  size?: number;
}

/** Aria gradient avatar — violet→cyan circle with Papicons Sparkles icon. */
export default function AriaAvatar({ size = 32 }: Props) {
  const half = size / 2;
  const iconSize = Math.round(size * 0.5);

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
        <Sparkles size={iconSize} color="#FFFFFF" />
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
      <Sparkles size={iconSize} color="#FFFFFF" />
    </LinearGradient>
  );
}
