/**
 * ThemeSelector — 3×3 grid of color themes for per-child personalization.
 *
 * Features:
 * - 9 theme buttons with bg color, accent stripe, and name
 * - Selected theme has white border + checkmark
 * - Live preview: tapping a theme updates the preview instantly (no save needed)
 * - Save button: persists the choice via ChildThemeContext
 */

import { useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import {
  CHILD_THEMES,
  THEME_IDS,
  type ThemeId,
} from '../../constants/themes';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useActiveChild } from '../../contexts/ActiveChildContext';

// ─── Props ───────────────────────────────────────────────

interface Props {
  /** Accent color for the section header */
  accentColor: string;
}

// ─── Component ───────────────────────────────────────────

export default function ThemeSelector({ accentColor }: Props) {
  const { currentThemeId, setChildTheme } = useChildTheme();
  const { selectedChildId, selectedChild } = useActiveChild();

  // Local preview state (not saved yet)
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId>(currentThemeId as ThemeId);
  const hasChanged = previewThemeId !== currentThemeId;

  const handleSelect = useCallback((id: ThemeId) => {
    setPreviewThemeId(id);
    // Live preview: immediately apply the theme
    setChildTheme(selectedChildId, id);
  }, [selectedChildId, setChildTheme]);

  const handleSave = useCallback(() => {
    setChildTheme(selectedChildId, previewThemeId);
  }, [selectedChildId, previewThemeId, setChildTheme]);

  const previewTheme = CHILD_THEMES[previewThemeId] || CHILD_THEMES.ocean;

  return (
    <Box className="mt-2">
      {/* Section header */}
      <HStack className="items-center gap-2 mb-1">
        <Ionicons name="color-palette" size={20} color={accentColor} />
        <Text className="text-base font-extrabold" style={{ color: '#FFFFFF' }}>
          Thème de {selectedChild.name}
        </Text>
      </HStack>
      <Text className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
        Personnalisez les couleurs de l'interface
      </Text>

      {/* 3×3 Grid */}
      <Box className="flex-row flex-wrap gap-2.5 mb-4">
        {THEME_IDS.map((id) => {
          const t = CHILD_THEMES[id];
          const isSelected = id === previewThemeId;

          return (
            <Pressable
              key={id}
              className="rounded-2xl p-2.5 justify-center items-center overflow-hidden relative"
              style={{
                width: '30.5%',
                flexGrow: 1,
                aspectRatio: 1,
                backgroundColor: t.bg,
                borderWidth: isSelected ? 2.5 : 2,
                borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
              }}
              onPress={() => handleSelect(id)}
            >
              {/* Accent stripe at bottom */}
              <Box
                className="absolute bottom-0 left-0 right-0"
                style={{ height: 4, backgroundColor: t.accent }}
              />

              {/* Theme name */}
              <Text className="text-xs font-bold mt-1" style={{ color: t.accentLight }}>
                {t.name}
              </Text>

              {/* Accent dot */}
              <Box
                className="rounded-full mb-1.5"
                style={{ width: 24, height: 24, backgroundColor: t.accent }}
              />

              {/* Checkmark for selected */}
              {isSelected && (
                <Box className="absolute top-1.5 right-1.5">
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </Box>
              )}
            </Pressable>
          );
        })}
      </Box>

      {/* Preview info */}
      <HStack
        className="items-center gap-2.5 p-3.5 rounded-xl"
        style={{
          backgroundColor: previewTheme.bg,
          borderWidth: 1,
          borderColor: previewTheme.accent + '40',
        }}
      >
        <Box
          className="rounded-full"
          style={{ width: 10, height: 10, backgroundColor: previewTheme.accent }}
        />
        <Text className="flex-1 text-sm font-semibold" style={{ color: previewTheme.accentLight }}>
          Thème actif : {previewTheme.name}
        </Text>
        <Box
          className="rounded-lg justify-center items-center"
          style={{ width: 32, height: 24, backgroundColor: previewTheme.accent }}
        >
          <Text className="text-xs font-extrabold text-white">Aa</Text>
        </Box>
      </HStack>
    </Box>
  );
}
