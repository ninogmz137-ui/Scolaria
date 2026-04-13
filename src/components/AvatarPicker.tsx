/**
 * AvatarPicker — Modal for customizing a child's avatar.
 *
 * Three tabs:
 * - Photo: pick from camera roll via expo-image-picker
 * - Emoji: grid of 30 common emojis
 * - Initials: auto-generated from child name (no config needed)
 *
 * Returns the selected avatar data to the parent component.
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Papicons } from '@getpapillon/papicons';
import ChildAvatar from './ChildAvatar';
import GlassCard from './GlassCard';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from './FloatingTabBar';

// ─── Types ──────────────────────────────────────────────

export type AvatarType = 'initials' | 'emoji' | 'photo';

export interface AvatarSelection {
  type: AvatarType;
  emoji?: string;
  photoUri?: string;
}

interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: AvatarSelection) => void;
  childName: string;
  accentColor: string;
  currentEmoji?: string;
  currentPhotoUri?: string;
}

// ─── Emoji grid ─────────────────────────────────────────

const EMOJI_OPTIONS = [
  '👧', '👦', '👩', '🧑', '👶', '🧒',
  '🦊', '🐱', '🐶', '🐰', '🦁', '🐼',
  '🌟', '🌈', '🎨', '🎸', '⚽', '🎮',
  '🦋', '🌻', '🍀', '🎵', '📚', '🚀',
  '🧸', '🎠', '🏖️', '🎪', '🎯', '💎',
];

// ─── Component ──────────────────────────────────────────

type Tab = 'emoji' | 'photo' | 'initials';

export default function AvatarPicker({
  visible,
  onClose,
  onSelect,
  childName,
  accentColor,
  currentEmoji,
  currentPhotoUri,
}: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || '👧');
  const [photoUri, setPhotoUri] = useState(currentPhotoUri);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la galerie photo est nécessaire pour choisir une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleConfirm = () => {
    if (activeTab === 'photo' && photoUri) {
      onSelect({ type: 'photo', photoUri });
    } else if (activeTab === 'emoji') {
      onSelect({ type: 'emoji', emoji: selectedEmoji });
    } else {
      onSelect({ type: 'initials' });
    }
    onClose();
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'emoji', label: 'Emoji', icon: 'Sparkles' },
    { key: 'photo', label: 'Photo', icon: 'Camera' },
    { key: 'initials', label: 'Initiales', icon: 'User' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          <Text style={s.title}>Choisir un avatar</Text>

          {/* Preview */}
          <View style={s.previewWrap}>
            <ChildAvatar
              name={childName}
              emoji={activeTab === 'emoji' ? selectedEmoji : undefined}
              photoUri={activeTab === 'photo' ? photoUri : undefined}
              accentColor={accentColor}
              size={80}
            />
            <Text style={s.previewName}>{childName}</Text>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={[s.tab, activeTab === tab.key && { backgroundColor: accentColor }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Papicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.key ? '#FFFFFF' : '#94A3B8'}
                />
                <Text style={[s.tabText, activeTab === tab.key && { color: '#FFFFFF' }]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}>
            {activeTab === 'emoji' && (
              <View style={s.emojiGrid}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[
                      s.emojiCell,
                      selectedEmoji === emoji && { backgroundColor: accentColor + '20', borderColor: accentColor },
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={s.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {activeTab === 'photo' && (
              <View style={s.photoSection}>
                <Pressable style={[s.photoBtn, { borderColor: accentColor }]} onPress={handlePickPhoto}>
                  <Papicons name="Camera" size={28} color={accentColor} />
                  <Text style={[s.photoBtnText, { color: accentColor }]}>
                    {photoUri ? 'Changer la photo' : 'Choisir une photo'}
                  </Text>
                </Pressable>
                {photoUri && (
                  <Text style={s.photoHint}>Photo sélectionnée</Text>
                )}
              </View>
            )}

            {activeTab === 'initials' && (
              <View style={s.initialsSection}>
                <ChildAvatar
                  name={childName}
                  accentColor={accentColor}
                  size={100}
                />
                <Text style={s.initialsHint}>
                  L'initiale de {childName} sera affichée
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={s.actions}>
            <Pressable style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[s.confirmBtn, { backgroundColor: accentColor }]} onPress={handleConfirm}>
              <Text style={s.confirmText}>Confirmer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.sansBold, fontSize: 20, color: '#0F172A',
    textAlign: 'center', marginBottom: 16,
  },
  previewWrap: {
    alignItems: 'center', marginBottom: 20,
  },
  previewName: {
    fontFamily: FontFamily.sansBold, fontSize: 16, color: '#0F172A', marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#94A3B8',
  },
  content: {
    maxHeight: 240,
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  emojiCell: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: 'transparent',
  },
  emojiText: { fontSize: 28 },
  photoSection: {
    alignItems: 'center', paddingVertical: 20, gap: 12,
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16,
    borderWidth: 2, borderStyle: 'dashed',
  },
  photoBtnText: {
    fontFamily: FontFamily.sansBold, fontSize: 15,
  },
  photoHint: {
    fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#10B981',
  },
  initialsSection: {
    alignItems: 'center', paddingVertical: 20, gap: 12,
  },
  initialsHint: {
    fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#94A3B8', textAlign: 'center',
  },
  actions: {
    flexDirection: 'row', gap: 12, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#EEF0F5', alignItems: 'center',
  },
  cancelText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: '#64748B' },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  confirmText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
});
