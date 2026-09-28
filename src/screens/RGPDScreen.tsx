import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  ShieldCheck,
  Trash2,
  Download,
} from 'lucide-react-native';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { Colors, SCREEN_BACKGROUND } from '../constants/colors';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import RgpdHero from '../components/rgpd/RgpdHero';
import RgpdRow from '../components/rgpd/RgpdRow';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from '../components/ui';
import { FORMULATION_HEBERGEMENT_ARIA } from '../constants/textesLegaux';

const RGPD_ITEMS = [
  {
    Icon: Shield,
    label: "Permissions d'accès",
    sublabel: 'Qui a accès au carnet de l’enfant',
    screen: 'PermissionsRGPD',
  },
  {
    Icon: Download,
    label: 'Télécharger le carnet',
    sublabel: 'Données, photos et documents, dans une archive',
    screen: 'ExportDonnees',
  },
  {
    Icon: Trash2,
    label: 'Effacer des données',
    sublabel: 'Un carnet ou votre compte, annulable 30 jours',
    screen: 'Effacement',
  },
  // Code de transfert : MASQUÉ tant qu'il ne fonctionne pas réellement (constat du 26 sept 2026 : écran
  // factice). Export et effacement : réels depuis L7.
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
          paddingBottom: getBottomBarScrollPadding(insets.bottom),
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
              {/* Formulation validée le 25 sept 2026 (CLAUDE.md, règles RGPD) — ne pas reformuler. */}
              <Text style={styles.noticeText}>{FORMULATION_HEBERGEMENT_ARIA}</Text>
              <Text style={[styles.noticeText, { marginTop: 8 }]}>
                Les données sont chiffrées au repos (AES-256) et pendant leur transfert (TLS).
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
