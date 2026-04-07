/**
 * ConversationDetailScreen — Placeholder conversation view with a teacher.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

export default function ConversationDetailScreen({ route }: { route: any }) {
  const insets = useSafeAreaInsets();
  const { name = 'Enseignant', role = '' } = route.params ?? {};

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 70 }]}>
        <View style={styles.iconCircle}>
          <MessageCircle size={32} color="#7C3AED" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Conversation avec {name}</Text>
        {role ? <Text style={styles.subtitle}>{role}</Text> : null}
        <Text style={styles.placeholder}>
          La messagerie sera disponible prochainement.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  placeholder: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
