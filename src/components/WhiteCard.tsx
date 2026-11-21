/**
 * WhiteCard — Carte blanche standard (pages profondes et listes)
 * Style Notion pur, pas de glass morphism.
 *
 * Android shadow pattern : outer View = elevation uniquement,
 * inner View = overflow hidden + contenu.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { C, RADIUS, SHADOW } from '../constants/design';

interface WhiteCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  innerStyle?: ViewStyle;
}

export const WhiteCard: React.FC<WhiteCardProps> = ({
  children,
  style,
  noPadding,
  innerStyle,
}) => (
  <View style={[styles.shadowWrapper, style]}>
    <View style={[styles.inner, noPadding && styles.noPadding, innerStyle]}>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: RADIUS.card,
    backgroundColor: C.white,
    ...(SHADOW.card as any),
  },
  inner: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderL,
  },
  noPadding: {
    padding: 0,
  },
});

export default WhiteCard;
