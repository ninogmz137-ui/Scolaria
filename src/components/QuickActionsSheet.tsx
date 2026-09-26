/**
 * QuickActionsSheet — actions du ✏️ de Messages (décision du 26 sept 2026) :
 * « Écrire à un enseignant » · « Signaler une absence ».
 * MASQUÉES pour un enfant sans enseignant rattaché (école hors Scolaria) : elles n'atteindraient
 * personne. Dans ce cas, le ✏️ lui-même n'est pas affiché (jamais de bouton inactif).
 * « Nouvel événement » n'est plus ici : c'est le « + » de l'Agenda.
 */

import React from 'react';
import { View, StyleSheet, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useEnseignantRattache } from '../hooks/useEnseignantRattache';
import { Text, Pressable } from './ui';

const ACTIONS = [
  { id: 'message', icon: MessageCircle, label: 'Écrire à un enseignant' },
  { id: 'absence', icon: UserX, label: 'Signaler une absence' },
] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function QuickActionsSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const enseignantRattache = useEnseignantRattache();

  const handleAction = (id: (typeof ACTIONS)[number]['id']) => {
    onClose();
    setTimeout(() => {
      navigation.navigate('MainPager', {
        screen: 'MessagerieTab',
        params: { screen: id === 'message' ? 'MessagesListScreen' : 'SignalerAbsence', initial: false },
      });
    }, 150);
  };

  if (!enseignantRattache) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Actions rapides</Text>
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.id}
                onPress={() => handleAction(action.id)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.82 }]}
                accessibilityRole="button"
              >
                <View style={styles.iconWrap}>
                  <Icon size={22} color="#0F172A" strokeWidth={2} />
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
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.sansMedium, fontSize: 16, color: '#0F172A',
  },
});
