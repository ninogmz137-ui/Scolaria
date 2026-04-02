import { Text } from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface Props {
  size?: number;
}

/** Aria gradient avatar — violet #8B5CF6 → cyan #06B6D4 with ✦ symbol. */
export default function AriaAvatar({ size = 36 }: Props) {
  return (
    <LinearGradient
      colors={['#8B5CF6', '#06B6D4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        className="font-black"
        style={{ color: Colors.white, fontSize: size * 0.45 }}
      >
        ✦
      </Text>
    </LinearGradient>
  );
}
