import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box, Text, Pressable, HStack } from './ui';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { type Child } from '../contexts/ActiveChildContext';

export type { Child };

type Props = {
  children: Child[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const AVATAR_COLORS = [Colors.violet, Colors.cyan, Colors.pink, Colors.green];

export default function ChildSwitcher({ children, selectedId, onSelect }: Props) {
  const { theme } = useSchoolMode();

  return (
    <Box className="mb-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {children.map((child, index) => {
          const isSelected = child.id === selectedId;
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <Pressable
              key={child.id}
              className="flex-row items-center rounded-2xl py-2.5 px-3.5"
              style={{
                backgroundColor: isSelected ? theme.bgLight : theme.card,
                borderWidth: 1.5,
                borderColor: isSelected ? theme.accent : 'transparent',
              }}
              onPress={() => onSelect(child.id)}
            >
              <Box
                className="items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: avatarColor,
                }}
              >
                <Text className="text-lg">{child.avatar}</Text>
              </Box>
              <Box className="ml-2.5">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? theme.textPrimary : theme.textMuted }}
                >
                  {child.name}
                </Text>
                <Text className="text-[11px] mt-px" style={{ color: theme.textMuted }}>
                  {child.classe}
                </Text>
              </Box>
              {isSelected && (
                <Box
                  className="ml-2.5 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: theme.accent,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
}
