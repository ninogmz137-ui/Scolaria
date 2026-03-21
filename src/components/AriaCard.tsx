import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Props = {
  childName: string;
  onPress?: () => void;
};

export default function AriaCard({ childName, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <LinearGradient
        colors={[Colors.violetDark, Colors.blueNight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative glow */}
        <View style={styles.glowOrb} />

        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="sparkles" size={20} color={Colors.cyan} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Aria</Text>
            <Text style={styles.subtitle}>Assistant scolaire intelligent</Text>
          </View>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.message}>
            « {childName} a progressé en maths cette semaine. Son investissement dans les exercices porte ses fruits ! »
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLink}>Discuter avec Aria</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.cyan} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.violet,
    opacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  messageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    color: Colors.lightGray,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.cyan,
  },
});
