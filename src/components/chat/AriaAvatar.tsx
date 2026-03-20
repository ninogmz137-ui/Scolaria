import { StyleSheet, Text, View } from 'react-native';
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
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.symbol, { fontSize: size * 0.45 }]}>✦</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbol: {
    color: Colors.white,
    fontWeight: '900',
  },
});
