import { View, Platform } from 'react-native';
import { Sparkles } from '@getpapillon/papicons';
import { ARIA_INDIGO } from '../../constants/theme';

interface Props {
  size?: number;
}

/** Aria avatar — white glass circle with indigo Papicons Sparkles icon. */
export default function AriaAvatar({ size = 32 }: Props) {
  const half = size / 2;
  const iconSize = Math.round(size * 0.52);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: 'rgba(255,255,255,0.70)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18 },
          android: { elevation: 0 },
        }),
      }}
    >
      <Sparkles size={iconSize} color={ARIA_INDIGO} />
    </View>
  );
}
