/**
 * DeepScreenHeader — Header standardisé pour les écrans profonds (non-onglets).
 * Structure : [←] [Titre centré + sous-titre] [Slot droite]
 *
 * Android safe : pas de gap, borderRadius sur conteneur avec backgroundColor.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from './ui';

interface DeepScreenHeaderProps {
  /** Absent : pas de bouton retour (écran racine d’un onglet). */
  onBack?: () => void;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  borderBottom?: boolean;
  /** Si true, ajoute le paddingTop safe area (écrans sans SafeAreaView parent) */
  withTopInset?: boolean;
}

export const DeepScreenHeader: React.FC<DeepScreenHeaderProps> = ({
  onBack,
  title,
  subtitle,
  rightElement,
  borderBottom = true,
  withTopInset = false,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        borderBottom && styles.border,
        withTopInset && { paddingTop: insets.top + 10 },
      ]}
    >
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {rightElement ?? <View style={{ width: 40 }} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.bg,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderL,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: C.text55,
    marginTop: 1,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
});

export default DeepScreenHeader;
