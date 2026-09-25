import React from 'react';
import { type TextStyle } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Colors } from '../../constants/colors';
import { Text } from '../ui';

type Props = {
  children: string;
  style?: TextStyle;
};

export default function RgpdSectionLabel({ children, style }: Props) {
  return (
    <Text
      style={[
        {
          fontFamily: FontFamily.sansSemiBold,
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: Colors.textMuted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

