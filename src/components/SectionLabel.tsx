import React from 'react';
import { Text, type TextProps } from 'react-native';

export default function SectionLabel({
  text,
  style,
  ...rest
}: { text: string } & Omit<TextProps, 'children'>) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: 'Figtree_600SemiBold',
          fontSize: 9,
          letterSpacing: 1.25,
          textTransform: 'uppercase',
          color: '#0F172A',
          opacity: 0.28,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 6,
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}

