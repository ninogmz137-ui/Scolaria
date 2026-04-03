/**
 * ThemeSelector — 3×3 grid of color themes for per-child personalization.
 *
 * Each cell shows the theme's accent color as a swatch.
 * Selected theme has accent border + checkmark.
 * Live preview: tapping a theme updates instantly.
 */

import { useState, useCallback } from 'react';
import { Box, Text, Pressable, HStack } from '../ui';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Papicons } from '@getpapillon/papicons';
import {
  CHILD_THEMES,
  THEME_IDS,
  type ThemeId,
} from '../../constants/themes';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useActiveChild } from '../../contexts/ActiveChildContext';

interface Props {
  accentColor: string;
}

export default function ThemeSelector({ accentColor }: Props) {
  const { currentThemeId, setChildTheme, theme } = useChildTheme();
  const { selectedChildId, selectedChild } = useActiveChild();

  const [previewThemeId, setPreviewThemeId] = useState<ThemeId>(currentThemeId as ThemeId);

  const handleSelect = useCallback((id: ThemeId) => {
    setPreviewThemeId(id);
    setChildTheme(selectedChildId, id);
  }, [selectedChildId, setChildTheme]);

  const previewTheme = CHILD_THEMES[previewThemeId] || CHILD_THEMES.ocean;

  // Mode-aware colors derived from theme context
  const cardText = theme.isDarkBg ? '#FFFFFF' : '#0F172A';
  const cardTextMuted = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';
  const cardBg = theme.isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)';
  const cardBorder = theme.isDarkBg ? 'rgba(255,255,255,0.12)' : '#EEF0F5';

  return (
    <Box className="mt-2">
      {/* Section header */}
      <HStack className="items-center gap-2 mb-1">
        <Papicons name="ColorPalette" size={20} color={accentColor} />
        <Text className="text-base font-extrabold" style={{ color: cardText }}>
          Thème de {selectedChild.name.split(' ')[0]}
        </Text>
      </HStack>
      <Text className="text-xs mb-4" style={{ color: cardTextMuted }}>
        Personnalisez les couleurs de l'interface
      </Text>

      {/* 3×3 Compact Grid */}
      <Box className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        {THEME_IDS.map((id) => {
          const t = CHILD_THEMES[id];
          const isSelected = id === previewThemeId;

          return (
            <Pressable
              key={id}
              className="rounded-xl items-center justify-center relative"
              style={{
                width: '30.5%',
                flexGrow: 1,
                padding: 10,
                backgroundColor: cardBg,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? t.accent : cardBorder,
              }}
              onPress={() => handleSelect(id)}
            >
              {/* Accent circle */}
              <Box
                className="rounded-full"
                style={{ width: 36, height: 36, backgroundColor: t.accent, marginBottom: 6 }}
              />

              {/* Theme name */}
              <Text style={{ fontSize: 10, fontFamily: FontFamily.sansMedium, color: cardText }}>
                {t.name}
              </Text>

              {/* Checkmark for selected */}
              {isSelected && (
                <Box className="absolute" style={{ top: 4, right: 4 }}>
                  <Papicons name="Check" size={14} color={t.accent} />
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
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: previewTheme.accent + '30',
        }}
      >
        <Box
          className="rounded-full"
          style={{ width: 10, height: 10, backgroundColor: previewTheme.accent }}
        />
        <Text className="flex-1 text-sm font-semibold" style={{ color: cardText }}>
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
