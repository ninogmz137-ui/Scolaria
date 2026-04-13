import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Pressable } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

const RGPD_ITEMS = [
  {
    icon: 'people' as const,
    label: "Permissions d'accès",
    sublabel: '4 niveaux : tuteur, famille, accompagnant, minimal',
    color: '#10B981',
    screen: 'PermissionsRGPD',
  },
  {
    icon: 'list' as const,
    label: "Journal d'accès",
    sublabel: 'Qui a consulté quoi et quand',
    color: '#22D3EE',
    screen: 'JournalAcces',
  },
  {
    icon: 'swap-horizontal' as const,
    label: 'Code de transfert',
    sublabel: 'SCA-TRANSFER entre établissements (90 jours)',
    color: '#7C3AED',
    screen: 'TransfertCode',
  },
  {
    icon: 'download' as const,
    label: 'Export intégral',
    sublabel: 'Télécharger toutes vos données en JSON + PDF',
    color: '#F59E0B',
    screen: 'ExportDonnees',
  },
  {
    icon: 'trash' as const,
    label: "Droit à l'effacement",
    sublabel: 'Suppression définitive du profil (Art. 17)',
    color: '#EF4444',
    screen: 'Effacement',
  },
];

export default function RGPDScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 56 + 12 }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
    >
      {/* Title */}
      <Text style={styles.title}>RGPD & Confidentialité</Text>
      <Text style={styles.subtitle}>
        Gérez vos données personnelles et celles de votre famille
      </Text>

      {/* Items card */}
      <View style={styles.card}>
        {RGPD_ITEMS.map((item, index) => (
          <Pressable
            key={item.screen}
            style={[styles.row, index < RGPD_ITEMS.length - 1 && styles.rowBorder]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.sublabel}>{item.sublabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </Pressable>
        ))}
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark" size={18} color="#7C3AED" />
        <Text style={styles.infoText}>
          Vos données sont chiffrées AES-256 et hébergées en France conformément au RGPD.
        </Text>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#0F172A',
  },
  sublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#7C3AED',
  },
});
