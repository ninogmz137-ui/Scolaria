/**
 * GlobalChildSwitcher — Avatar button in header + bottom sheet modal.
 *
 * Shows the active child's avatar in the top-right of every screen header.
 * On tap, opens a modal listing all children for quick switching.
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { useActiveChild, type Child } from '../contexts/ActiveChildContext';
import { useSchoolMode, getSchoolModeFromBirthDate, THEMES } from '../contexts/SchoolModeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mode accent colors for avatar ring
const MODE_COLORS: Record<string, string> = {
  maternelle: '#FF8C42',
  primaire: '#22D3EE',
  lycee: '#6D28D9',
};

// ─── Header Avatar Button ─────────────────────────────────

export function HeaderChildAvatar() {
  const { selectedChild } = useActiveChild();
  const { theme } = useSchoolMode();
  const [modalVisible, setModalVisible] = useState(false);

  const modeColor = MODE_COLORS[theme.mode] || '#3B82F6';

  return (
    <>
      <Pressable
        className="justify-center items-center mr-3"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 2.5,
          borderColor: modeColor,
          backgroundColor: 'rgba(128,128,128,0.1)',
        }}
        onPress={() => setModalVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-lg">{selectedChild.avatar}</Text>
      </Pressable>

      <ChildSwitcherModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

// ─── Bottom Sheet Modal ────────────────────────────────────

function ChildSwitcherModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { children, selectedChildId, selectChild } = useActiveChild();
  const { theme } = useSchoolMode();

  const handleSelect = useCallback(
    (id: string) => {
      selectChild(id);
      onClose();
    },
    [selectChild, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-3xl px-5"
          style={{
            backgroundColor: '#F2F2F7',
            maxHeight: SCREEN_HEIGHT * 0.6,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
              android: {
                elevation: 0,
              },
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
            }),
          }}
          onPress={(e: any) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <Box className="items-center pt-3 pb-2">
            <Box
              className="rounded-sm"
              style={{ width: 40, height: 4, backgroundColor: '#94A3B8', opacity: 0.4 }}
            />
          </Box>

          {/* Title */}
          <HStack className="justify-between items-center mb-4">
            <Text className="text-xl font-extrabold" style={{ color: '#0F172A' }}>
              Changer d'enfant
            </Text>
            <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color="#94A3B8" />
            </Pressable>
          </HStack>

          {/* Children list */}
          <VStack className="gap-2.5">
            {children.map((child) => {
              const isSelected = child.id === selectedChildId;
              const childMode = child.birthDate
                ? getSchoolModeFromBirthDate(child.birthDate)
                : 'primaire';
              const childTheme = THEMES[childMode];
              const modeColor = MODE_COLORS[childMode] || '#3B82F6';

              return (
                <Pressable
                  key={child.id}
                  className="flex-row items-center py-3.5 px-3.5 rounded-2xl"
                  style={{
                    borderWidth: 1.5,
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    borderColor: isSelected ? modeColor : 'rgba(203,213,225,0.5)',
                  }}
                  onPress={() => handleSelect(child.id)}
                >
                  {/* Avatar */}
                  <Box
                    className="justify-center items-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      borderWidth: 2.5,
                      borderColor: modeColor,
                      backgroundColor: 'rgba(128,128,128,0.08)',
                    }}
                  >
                    <Text className="text-2xl">{child.avatar}</Text>
                  </Box>

                  {/* Info */}
                  <Box className="flex-1 ml-3.5">
                    <Text className="text-[17px] font-bold" style={{ color: '#0F172A' }}>
                      {child.name}
                    </Text>
                    <Text className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>
                      {child.classe}
                    </Text>
                  </Box>

                  {/* Mode badge */}
                  <Box
                    className="px-2 py-1 rounded-lg mr-2"
                    style={{
                      borderWidth: 1,
                      backgroundColor: modeColor + '20',
                      borderColor: modeColor + '40',
                    }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: modeColor }}>
                      {childTheme.label}
                    </Text>
                  </Box>

                  {/* Selected indicator */}
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={modeColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </Pressable>
              );
            })}
          </VStack>

          {/* Bottom safe area */}
          <Box style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default HeaderChildAvatar;
