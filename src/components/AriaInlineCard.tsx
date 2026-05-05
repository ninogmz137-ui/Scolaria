/**
 * AriaInlineCard — Carte Aria générique (gradient léger EEF2FF → F0FDFA).
 * Utilisée dans tous les écrans profonds pour les suggestions Aria.
 *
 * NE PAS confondre avec AriaCard (legacy Gluestack) ni dashboard/AriaCard.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import ScolariaSymbol from './ScolariaSymbol';

interface AriaInlineCardProps {
  children: React.ReactNode;
  label?: string;
}

export const AriaInlineCard: React.FC<AriaInlineCardProps> = ({
  children,
  label = 'Aria',
}) => (
  <LinearGradient
    colors={['#EEF2FF', '#F0FDFA']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.container}
  >
    <View style={styles.inner}>
      <View style={styles.header}>
        <ScolariaSymbol size={14} color={C.indigo} />
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
      {typeof children === 'string' ? (
        <Text style={styles.text}>{children}</Text>
      ) : (
        children
      )}
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.10)',
  },
  inner: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: C.indigo,
    letterSpacing: 0.6,
    marginLeft: 7,
  },
  text: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13.5,
    color: C.text,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

export default AriaInlineCard;
