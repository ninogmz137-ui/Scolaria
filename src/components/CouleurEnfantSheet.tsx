/**
 * CouleurEnfantSheet — choisir la couleur de l'enfant (avatar + header de l'Accueil).
 * Bottom sheet (COMPONENTS §11) : pastilles CHILD_COLORS, enregistrement immédiat.
 */

import { Modal, View, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { CHILD_COLORS } from '../constants/childColors';
import { useActiveChild, DEFAULT_CHILD_COLOR, type Child } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import ChildAvatar from './ChildAvatar';
import { Text, Pressable } from './ui';

export default function CouleurEnfantSheet({
  child,
  visible,
  onClose,
}: {
  child: Child;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { setChildColor } = useActiveChild();
  const actuelle = child.color ?? DEFAULT_CHILD_COLOR;

  const choisir = async (hex: string) => {
    try {
      await setChildColor(child.id, hex);
      onClose();
    } catch {
      Alert.alert('Couleur non enregistrée', 'Vérifiez votre connexion puis réessayez.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={st.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={st.handle} />
          <View style={st.header}>
            <ChildAvatar child={child} size={44} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={st.title}>Couleur de {child.name}</Text>
              <Text style={st.sub}>Avatar et header de l’Accueil de son carnet</Text>
            </View>
          </View>
          <View style={st.row}>
            {CHILD_COLORS.map((c) => {
              const active = c.hex.toLowerCase() === actuelle.toLowerCase();
              return (
                <TouchableOpacity
                  key={c.hex}
                  style={[st.ring, active && st.ringActive]}
                  onPress={() => choisir(c.hex)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                  accessibilityRole="radio"
                  accessibilityLabel={c.nom}
                  accessibilityState={{ selected: active }}
                >
                  <View style={[st.swatch, { backgroundColor: c.hex }]}>
                    {active && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.16)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 32, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
  sub: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8 },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringActive: { borderColor: '#0F172A' },
  swatch: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
