import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

const BG = '#F2F1EE';
const NAVY = '#0F172A';

export default function InscriptionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
        </Pressable>

        <Text style={styles.headerTitle}>Inscription</Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.text}>
          Inscription — à implémenter au sprint suivant.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: NAVY,
    letterSpacing: -0.3,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  text: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
  },
});

