import React from 'react';
import {
  View, Text, Pressable, StyleSheet,
  Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Calendar, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../hooks/useSolariaFonts';

const ACTIONS = [
  {
    id: 'message',
    icon: MessageCircle,
    label: 'Écrire à un enseignant',
    color: '#4338CA',
    bg: 'rgba(67,56,202,0.08)',
  },
  {
    id: 'agenda',
    icon: Calendar,
    label: 'Nouvel événement',
    color: '#0F766E',
    bg: 'rgba(15,118,110,0.08)',
  },
  {
    id: 'absence',
    icon: UserX,
    label: 'Déclarer une absence',
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function QuickActionsSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleAction = (id: string) => {
    onClose();
    setTimeout(() => {
      switch (id) {
        case 'message':
          navigation.navigate('MainPager', {
            screen: 'MessagerieTab',
            params: { screen: 'MessagesListScreen' },
          });
          break;
        case 'agenda':
          navigation.navigate('MainPager', {
            screen: 'Agenda',
            params: { screen: 'AgendaHome', params: { openAddModal: true } },
          });
          break;
        case 'absence':
          navigation.navigate('MainPager', {
            screen: 'Accueil',
            params: { screen: 'SignalerAbsenceScreen' },
          });
          break;
      }
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Actions rapides</Text>
          {ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.id}
                onPress={() => handleAction(action.id)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.82 }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: action.bg }]}>
                  <Icon size={22} color={action.color} strokeWidth={1.8} />
                </View>
                <Text style={styles.label}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F2F1EE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      android: { elevation: 20 },
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
    }),
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18, color: '#0F172A',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)',
    gap: 14,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.sansMedium, fontSize: 16, color: '#0F172A',
  },
});
