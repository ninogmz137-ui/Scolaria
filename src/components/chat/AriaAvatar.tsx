import { Text } from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface Props {
  size?: number;
}

export default function AriaAvatar({ size = 36 }: Props) {
  return (
    <LinearGradient
      colors={[Colors.violet, Colors.cyan]}
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
