import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  ListChecks,
  ArrowRightLeft,
  Download,
  Trash2,
  ShieldCheck,
} from 'lucide-react-native';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { Colors, SCREEN_BACKGROUND } from '../constants/colors';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import RgpdHero from '../components/rgpd/RgpdHero';
import RgpdRow from '../components/rgpd/RgpdRow';
import { FontFamily } from '../hooks/useSolariaFonts';

const RGPD_ITEMS = [
  {
    Icon: Shield,
    label: "Permissions d'accès",
    sublabel: 'Niveaux et modules autorisés',
    screen: 'PermissionsRGPD',
  },
  {
    Icon: ListChecks,
    label: "Journal d'accès",
    sublabel: 'Consultations, modifications et exports',
    screen: 'JournalAcces',
  },
  {
    Icon: ArrowRightLeft,
    label: 'Code de transfert',
    sublabel: 'Transférer un dossier scolaire (90 jours)',
    screen: 'TransfertCode',
  },
  {
    Icon: Download,
    label: 'Export intégral',
    sublabel: 'Portabilité JSON + PDF',
    screen: 'ExportDonnees',
  },
  {
    Icon: Trash2,
    label: "Droit à l'effacement",
    sublabel: 'Suppression définitive (Art. 17)',
    screen: 'Effacement',
  },
] as const;

export default function RGPDScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 56 + 12,
          paddingBottom: TAB_BAR_SCROLL_PADDING,
          paddingHorizontal: 18,
        }}
      >
        <RgpdHero
          Icon={ShieldCheck}
          title="RGPD & confidentialité"
          subtitle="Gérez vos données personnelles et celles de votre famille."
        />

        <GlassCard noPadding style={{ marginTop: 14, borderWidth: 1, borderColor: Colors.cardBorder }}>
          {RGPD_ITEMS.map((item, idx) => (
            <RgpdRow
              key={item.screen}
              Icon={item.Icon}
              title={item.label}
              subtitle={item.sublabel}
              onPress={() => navigation.navigate(item.screen)}
              isLast={idx === RGPD_ITEMS.length - 1}
            />
          ))}
        </GlassCard>

        <GlassCard style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <View style={styles.noticeIconWrap}>
              <ShieldCheck size={18} color={Colors.textPrimary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Sécurité & transparence</Text>
              <Text style={styles.noticeText}>
                Vos données sont chiffrées (AES-256) et hébergées en France. Chaque consultation,
                modification et export est journalisé et visible dans le journal d’accès.
              </Text>
            </View>
          </View>
        </GlassCard>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BACKGROUND },
  noticeCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.14)',
    marginTop: 1,
  },
  noticeTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  noticeText: {
    marginTop: 4,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
});
